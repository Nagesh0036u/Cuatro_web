'use strict';

/**
 * Transparent, keyword and skills based job matching.
 *
 * Every number returned here is computed from the candidate's profile / resume text and the
 * job record. There are no random or fixed scores. The engine is intentionally a pure function
 * (`scoreJob(candidate, job)`) so a semantic / NLP matcher can later replace `scoreJob`
 * without touching the routes or the front end (the response shape stays the same).
 */

const { extractSkills, canonicalise, skillCategories } = require('./skills');

const WEIGHTS = { skills: 55, keywords: 15, qualification: 10, experience: 10, category: 10 };

const STOPWORDS = new Set(('a an the and or of to in for with on at by from as is are was were be been being this that these those it its ' +
  'we you your our their they he she i will can may must should would could have has had do does did not no yes but if then than so such ' +
  'job role position candidate candidates team work working works ability able strong good excellent knowledge experience years year ' +
  'required requirements responsibilities responsible including include includes etc using use used new well also any all more other ' +
  'company business support help ensure across within about into over under per etc skills skill').split(/\s+/));

const EDU_LEVELS = [
  { rank: 4, label: 'Doctorate', re: /\b(ph\.?d|doctorate|doctoral)\b/i },
  { rank: 3, label: 'Master\'s degree', re: /\b(master'?s?|m\.?tech|m\.?sc|m\.?e\b|mba|mca|m\.?com|m\.?a\b|pgdm|post[- ]?graduate)\b/i },
  { rank: 2, label: 'Bachelor\'s degree', re: /\b(bachelor'?s?|b\.?tech|b\.?e\b|b\.?sc|bca|bba|b\.?com|b\.?a\b|b\.?arch|b\.?pharm|undergraduate|graduate|graduation|degree)\b/i },
  { rank: 1, label: 'Diploma', re: /\b(diploma|polytechnic|iti|higher secondary|12th|intermediate)\b/i }
];

function splitList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value).split(/[,\n;|]/).map((v) => v.trim()).filter(Boolean);
}

function tokenise(text) {
  return (String(text || '').toLowerCase().match(/[a-z][a-z0-9+#.]{2,}/g) || [])
    .map((t) => t.replace(/\.+$/, ''))
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function topKeywords(text, limit = 30) {
  const freq = new Map();
  tokenise(text).forEach((t) => freq.set(t, (freq.get(t) || 0) + 1));
  return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map((e) => e[0]);
}

function educationRanks(text) {
  const ranks = [];
  EDU_LEVELS.forEach((lvl) => { if (lvl.re.test(text || '')) ranks.push(lvl.rank); });
  return ranks;
}

/** Years of experience written like "3 years", "2+ yrs". Returns the largest plausible value. */
function extractExperienceYears(text) {
  const src = String(text || '');
  const re = /(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b/gi;
  let best = null; let m;
  while ((m = re.exec(src))) {
    const v = parseFloat(m[1]);
    const ctx = src.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40);
    if (v >= 0 && v <= 40 && /experience|\bexp\b/i.test(ctx)) best = Math.max(best === null ? 0 : best, v);
  }
  return best;
}

/**
 * Build the candidate model used by the matcher.
 * @param {object} profile  student_profiles row (+ full_name)
 * @param {object|null} resume resumes row with extracted_text
 */
function buildCandidate(profile, resume) {
  const text = [resume && resume.extracted_text, profile && profile.experience, profile && profile.specialisation, profile && profile.degree]
    .filter(Boolean).join('\n');
  const profileSkills = splitList(profile && profile.skills).map(canonicalise).filter(Boolean);
  const resumeSkills = extractSkills(resume && resume.extracted_text);
  const textSkills = extractSkills(text);
  const skills = Array.from(new Set([...profileSkills, ...resumeSkills, ...textSkills]));
  const eduText = [profile && profile.degree, profile && profile.specialisation, resume && resume.extracted_text].filter(Boolean).join(' ');
  const ranks = educationRanks(eduText);
  const years = (profile && profile.experience_years != null && profile.experience_years !== '')
    ? Number(profile.experience_years)
    : extractExperienceYears(text);
  return {
    skills,
    profileSkills,
    resumeSkills,
    text,
    educationRank: ranks.length ? Math.max(...ranks) : 0,
    degreeTokens: tokenise([profile && profile.degree, profile && profile.specialisation].filter(Boolean).join(' ')),
    experienceYears: years,
    hasResume: !!(resume && resume.extracted_text && resume.extracted_text.trim().length > 0)
  };
}

function candidateIsSufficient(c) {
  return c.skills.length >= 2 || c.text.trim().length >= 200;
}

function jobSkillList(job) {
  const declared = splitList(job.skills).map(canonicalise).filter(Boolean);
  if (declared.length) return { skills: Array.from(new Set(declared)), derived: false };
  const derived = extractSkills([job.title, job.description, job.responsibilities, job.qualifications].filter(Boolean).join('\n'));
  return { skills: derived, derived: true };
}

function pct(n) { return Math.round(n * 100); }

function scoreJob(candidate, job) {
  const reasons = [];
  const parts = {}; // component -> {score 0..1, weight, detail}

  // --- skills ---------------------------------------------------------------------------
  const { skills: required } = jobSkillList(job);
  const have = new Set(candidate.skills.map((s) => s.toLowerCase()));
  const matching = required.filter((s) => have.has(s.toLowerCase()));
  const missing = required.filter((s) => !have.has(s.toLowerCase()));
  const requiredLower = new Set(required.map((s) => s.toLowerCase()));
  const additional = candidate.skills.filter((s) => !requiredLower.has(s.toLowerCase()));
  if (required.length) {
    parts.skills = { score: matching.length / required.length, weight: WEIGHTS.skills };
    reasons.push(`You match ${matching.length} of ${required.length} skills listed for this role.`);
  }

  // --- keywords (title / description / responsibilities vs resume text) -------------------
  const jobText = [job.title, job.title, job.short_description, job.description, job.responsibilities].filter(Boolean).join('\n');
  const jobKeys = topKeywords(jobText, 25);
  if (jobKeys.length && candidate.text) {
    const candTokens = new Set(tokenise(candidate.text));
    const hits = jobKeys.filter((k) => candTokens.has(k));
    parts.keywords = { score: hits.length / jobKeys.length, weight: WEIGHTS.keywords };
    if (hits.length) reasons.push(`${hits.length} of the top ${jobKeys.length} keywords in the job description also appear in your profile or resume.`);
  }

  // --- qualification ------------------------------------------------------------------------
  const jobEdu = educationRanks(job.qualifications || '');
  if (jobEdu.length) {
    const required_rank = Math.min(...jobEdu);
    let levelScore = 0;
    if (candidate.educationRank >= required_rank) levelScore = 1;
    else if (candidate.educationRank === required_rank - 1 && candidate.educationRank > 0) levelScore = 0.5;
    else if (candidate.educationRank > 0) levelScore = 0.25;
    const qualText = String(job.qualifications || '').toLowerCase();
    const fieldHit = candidate.degreeTokens.some((t) => t.length >= 4 && qualText.includes(t));
    parts.qualification = { score: Math.min(1, levelScore * 0.8 + (fieldHit ? 0.2 : 0)), weight: WEIGHTS.qualification };
    if (levelScore === 1) reasons.push('Your education level meets the stated qualification.');
    else if (candidate.educationRank === 0) reasons.push('We could not detect your education level; add your degree to your profile.');
    else reasons.push('Your education level is below the qualification listed for this role.');
  }

  // --- experience ---------------------------------------------------------------------------
  const minYears = job.experience_years_min;
  if (minYears !== null && minYears !== undefined && minYears !== '') {
    const need = Number(minYears);
    if (need <= 0) {
      parts.experience = { score: 1, weight: WEIGHTS.experience };
      reasons.push('This role is open to freshers / entry level candidates.');
    } else if (candidate.experienceYears === null || candidate.experienceYears === undefined) {
      parts.experience = { score: 0, weight: WEIGHTS.experience };
      reasons.push(`The role asks for ${need}+ years; we could not detect your experience.`);
    } else {
      parts.experience = { score: Math.min(1, candidate.experienceYears / need), weight: WEIGHTS.experience };
      reasons.push(candidate.experienceYears >= need
        ? `Your ${candidate.experienceYears} years of experience meet the ${need}+ years requested.`
        : `The role asks for ${need}+ years; you have ${candidate.experienceYears}.`);
    }
  }

  // --- category affinity --------------------------------------------------------------------
  if (job.category_name) {
    const inCategory = candidate.skills.filter((s) => skillCategories(s).includes(job.category_name));
    const titleWords = tokenise(job.title);
    const titleHit = titleWords.length && titleWords.filter((w) => candidate.text.toLowerCase().includes(w)).length / titleWords.length >= 0.5;
    const score = Math.min(1, inCategory.length / 3 + (titleHit ? 0.34 : 0));
    parts.category = { score: Math.min(1, score), weight: WEIGHTS.category };
    if (inCategory.length) reasons.push(`${inCategory.length} of your skills belong to the "${job.category_name}" category.`);
  }

  // --- combine (weights are re-normalised across the components that apply) --------------
  const keys = Object.keys(parts);
  const totalWeight = keys.reduce((a, k) => a + parts[k].weight, 0);
  const raw = totalWeight ? keys.reduce((a, k) => a + parts[k].score * parts[k].weight, 0) / totalWeight : 0;
  const breakdown = {};
  keys.forEach((k) => { breakdown[k] = { score: pct(parts[k].score), weight: Math.round((parts[k].weight / totalWeight) * 100) }; });

  return {
    score: pct(raw),
    matchingSkills: matching,
    missingSkills: missing,
    additionalSkills: additional.slice(0, 12),
    requiredSkills: required,
    breakdown,
    reasons,
    sufficient: candidateIsSufficient(candidate)
  };
}

/** Rank an array of job rows for a student. */
function recommend(profile, resume, jobs, { minScore = 0, limit = 50 } = {}) {
  const candidate = buildCandidate(profile, resume);
  if (!candidateIsSufficient(candidate)) {
    return {
      sufficient: false,
      message: 'We need more information to recommend jobs. Add your skills, degree and experience to your profile and upload a resume (PDF, DOCX or TXT).',
      candidateSkills: candidate.skills,
      results: []
    };
  }
  const results = jobs
    .map((job) => ({ job, match: scoreJob(candidate, job) }))
    .filter((r) => r.match.score >= minScore)
    .sort((a, b) => b.match.score - a.match.score || (b.job.posted_at || '').localeCompare(a.job.posted_at || ''))
    .slice(0, limit);
  return { sufficient: true, candidateSkills: candidate.skills, results };
}

module.exports = {
  WEIGHTS, buildCandidate, scoreJob, recommend, extractExperienceYears, splitList, tokenise, educationRanks, candidateIsSufficient
};
