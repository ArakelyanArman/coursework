// @ts-check
import { PasswordField, TextField } from '../../components/TextField/TextField.js';
import { rules } from '../core/validate.js';
import { login } from '../services/auth.js';
import { mountShell } from '../shell.js';
import { mountAuthForm } from './auth/form.js';

await mountShell({ page: 'login', access: 'guest' });

mountAuthForm({
  fields: {
    email: TextField({
      label: { key: 'auth.email' },
      name: 'email',
      type: 'email',
      autocomplete: 'email',
      required: true,
    }),
    password: PasswordField({
      label: { key: 'auth.password' },
      name: 'password',
      autocomplete: 'current-password',
      required: true,
    }),
  },
  schema: {
    email: [rules.required(), rules.email()],
    password: [rules.required()],
  },
  submitLabel: { key: 'auth.login.submit' },
  submit: ({ email, password }) => login(email, password),
  welcomeKey: 'auth.welcomeBack',
  switchPage: 'register.html',
});
