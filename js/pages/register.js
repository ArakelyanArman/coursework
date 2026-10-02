// @ts-check
import { PasswordField, TextField } from '../../components/TextField/TextField.js';
import { rules } from '../core/validate.js';
import { register } from '../services/auth.js';
import { mountShell } from '../shell.js';
import { mountAuthForm } from './auth/form.js';

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 80;

await mountShell({ page: 'register', access: 'guest' });

mountAuthForm({
  fields: {
    email: TextField({
      label: { key: 'auth.email' },
      name: 'email',
      type: 'email',
      autocomplete: 'email',
      required: true,
    }),
    fullName: TextField({
      label: { key: 'auth.fullName' },
      name: 'fullName',
      autocomplete: 'name',
      required: true,
    }),
    password: PasswordField({
      label: { key: 'auth.password' },
      name: 'password',
      autocomplete: 'new-password',
      helper: { key: 'auth.passwordHelper' },
      required: true,
    }),
  },
  schema: {
    email: [rules.required(), rules.email()],
    fullName: [rules.required(), rules.maxLength(MAX_NAME_LENGTH)],
    password: [rules.required(), rules.minLength(MIN_PASSWORD_LENGTH)],
  },
  submitLabel: { key: 'auth.register.submit' },
  submit: ({ email, fullName, password }) => register({ email, fullName, password }),
  // A taken address is the email field's problem, so it is reported there.
  fieldErrors: { email_taken: 'email' },
  welcomeKey: 'auth.welcome',
  switchPage: 'login.html',
});
