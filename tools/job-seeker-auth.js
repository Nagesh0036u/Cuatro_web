'use strict';
/**
 * "Job Seeker" sign-in page: one card with Login / Sign Up tabs.
 * Generates student-portal/login.html (Login tab open) and student-portal/register.html (Sign Up tab open).
 * Behaviour lives in assets/js/cuatro-student.js (tabs, password eye, email code, forgot password).
 */

const ICONS = {
  mail: '<path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  phone: '<path d="M6.6 3h3l1.5 4.5-2.2 1.4a11 11 0 0 0 6.2 6.2l1.4-2.2L21 14.4v3A2.6 2.6 0 0 1 18.4 20 15.4 15.4 0 0 1 4 5.6 2.6 2.6 0 0 1 6.6 3z"/>',
  cap: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>',
  shield: '<path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
const icon = (n) => `<svg class="cx-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[n]}</svg>`;

/** Input with a leading icon. `after` is extra markup inside the box (eye button, Send Code button). */
function input({ id, name, type = 'text', label, ico, required = false, autocomplete = '', attrs = '', after = '', help = '' }) {
  return `<div class="cf-group cx-field">
                                        <label class="cx-sr" for="${id}">${label}</label>
                                        <div class="cx-input">${icon(ico)}<input id="${id}" name="${name}" type="${type}" placeholder="${label}"${required ? ' required' : ''}${autocomplete ? ` autocomplete="${autocomplete}"` : ''} ${attrs}>${after}</div>
                                        ${help ? `<small class="cf-help">${help}</small>` : ''}<div class="cf-error" data-error-for="${name}"></div>
                                    </div>`;
}
const eye = `<button type="button" class="cx-eye" aria-label="Show password" aria-pressed="false">${icon('eye')}</button>`;

function jobSeekerBody({ tab, logo, companyName }) {
  const login = tab === 'login';
  return `        <section class="cx-auth">
            <div class="container">
                <div class="cx-auth__card wow fadeInUp animated" data-wow-delay="200ms" data-tab="${tab}">
                    <div class="cx-auth__brand"><img src="/${logo}" alt="${companyName}" width="170"></div>
                    <h2 class="cx-auth__title" id="auth-title">${login ? 'Welcome Back' : 'Create Your Account'}</h2>
                    <p class="cx-auth__sub" id="auth-sub">${login ? 'Sign in to your Job Seeker account' : 'Verify your email, then set your password'}</p>

                    <div class="cx-tabs" role="tablist" aria-label="Job Seeker account">
                        <span class="cx-tabs__pill" aria-hidden="true"></span>
                        <button type="button" class="cx-tabs__btn" role="tab" id="tab-login" aria-controls="panel-login" aria-selected="${login}" data-tab="login">Login</button>
                        <button type="button" class="cx-tabs__btn" role="tab" id="tab-signup" aria-controls="panel-signup" aria-selected="${!login}" data-tab="signup">Sign Up</button>
                    </div>

                    <div class="cx-panel" role="tabpanel" id="panel-login" aria-labelledby="tab-login"${login ? '' : ' hidden'}>
                        <form class="cuatro-form cx-form" id="login-form" novalidate>
                            ${input({ id: 'l-email', name: 'email', type: 'email', label: 'Email Address', ico: 'mail', required: true, autocomplete: 'email' })}
                            ${input({ id: 'l-password', name: 'password', type: 'password', label: 'Password', ico: 'lock', required: true, autocomplete: 'current-password', after: eye })}
                            <div class="cx-form__row cx-form__row--end"><a href="/student-portal/forgot-password" id="forgot-link" class="cx-link">Forgot password?</a></div>
                            <div class="cf-status" role="status" aria-live="polite"></div>
                            <button type="submit" class="ostech-btn cx-submit"><span>Sign In</span></button>
                        </form>
                        <p class="cx-auth__switch">Don't have an account? <a href="/student-portal/register" class="cx-link" data-switch="signup">Sign up</a></p>
                    </div>

                    <div class="cx-panel" role="tabpanel" id="panel-signup" aria-labelledby="tab-signup"${login ? ' hidden' : ''}>
                        <form class="cuatro-form cx-form" id="register-form" novalidate>
                            ${input({ id: 'f-full_name', name: 'full_name', label: 'Full Name', ico: 'user', required: true, autocomplete: 'name' })}
                            <div class="cf-group cx-field cx-verify" id="email-verify">
                                <label class="cx-sr" for="f-email">Email Address</label>
                                <div class="cx-input">${icon('mail')}<input id="f-email" name="email" type="email" placeholder="Email Address" required autocomplete="email"><button type="button" class="cx-inline-btn" id="send-code"><span>Send Code</span></button></div>
                                <div class="cf-error" data-error-for="email"></div>
                                <div class="cx-verify__code" id="code-row" hidden>
                                    <label class="cx-sr" for="f-code">Verification code</label>
                                    <div class="cx-input">${icon('shield')}<input id="f-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="6-digit code from your email"><button type="button" class="cx-inline-btn" id="verify-code"><span>Verify</span></button></div>
                                    <div class="cf-error" data-error-for="code"></div>
                                </div>
                                <div class="cx-verify__msg" id="verify-msg" role="status" aria-live="polite"></div>
                                <input type="hidden" name="verify_token" id="f-verify-token">
                            </div>
                            <div class="cx-grid2">
                                ${input({ id: 'f-contact_number', name: 'contact_number', type: 'tel', label: 'Contact Number', ico: 'phone', required: true, autocomplete: 'tel' })}
                                ${input({ id: 'f-graduation_year', name: 'graduation_year', type: 'number', label: 'Graduation Year', ico: 'cap', required: true, attrs: 'min="1970" max="2100"' })}
                            </div>
                            ${input({ id: 'f-password', name: 'password', type: 'password', label: 'Password', ico: 'lock', required: true, autocomplete: 'new-password', after: eye, help: 'At least 8 characters with a letter and a number.' })}
                            ${input({ id: 'f-confirm_password', name: 'confirm_password', type: 'password', label: 'Confirm Password', ico: 'lock', required: true, autocomplete: 'new-password', after: eye })}
                            <label class="cf-check cx-check"><input type="checkbox" name="terms" required> <span>I agree that ${companyName} may store and process my details and resume for recruitment purposes.</span></label>
                            <div class="cf-error" data-error-for="terms"></div>
                            <div class="cf-status" role="status" aria-live="polite"></div>
                            <button type="submit" class="ostech-btn cx-submit"><span>Create Account</span></button>
                        </form>
                        <p class="cx-auth__switch">Already have an account? <a href="/student-portal/login" class="cx-link" data-switch="login">Log in</a></p>
                        <p class="cx-auth__note">College, skills and experience can be added in your profile after sign up.</p>
                    </div>
                </div>
            </div>
        </section>
`;
}

module.exports = { jobSeekerBody };
