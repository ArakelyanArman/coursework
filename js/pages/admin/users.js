// @ts-check
import { Avatar } from '../../../components/Avatar/Avatar.js';
import { Badge } from '../../../components/Badge/Badge.js';
import { Button, IconButton, setDisabled } from '../../../components/Button/Button.js';
import { DataTable } from '../../../components/DataTable/DataTable.js';
import { confirmDialog, formDialog } from '../../../components/Dialog/Dialog.js';
import { EmptyState } from '../../../components/EmptyState/EmptyState.js';
import { Select } from '../../../components/Select/Select.js';
import {
  PasswordField,
  TextField,
  inputOf,
  setFieldError,
} from '../../../components/TextField/TextField.js';
import { toast } from '../../../components/Toast/Toast.js';
import { h } from '../../core/dom.js';
import { formatDate } from '../../core/format.js';
import { ApiError } from '../../core/http.js';
import { whileConnected } from '../../core/i18n.js';
import { refs } from '../../core/template.js';
import { rules, validate } from '../../core/validate.js';
import {
  ROLES,
  createUser,
  deleteUser,
  isSelf,
  listUsers,
  updateUser,
} from '../../services/users.js';
import { mountAdmin } from './layout.js';
import { mountList } from './list.js';

/** @typedef {import('../../types.js').User} User */

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 80;

await mountAdmin('users');

/**
 * The Add / Edit user dialog. An admin editing their own account cannot change their role.
 * @param {User} [user] The user to edit; leave out to add one.
 * @returns {Promise<User | null>}
 */
function openUserForm(user) {
  const own = user ? isSelf(user.id) : false;
  /** @type {Record<string, HTMLElement>} */
  const fields = {
    fullName: TextField({
      label: { key: 'auth.fullName' },
      name: 'fullName',
      value: user?.fullName ?? '',
      autocomplete: 'off',
      required: true,
    }),
    email: TextField({
      label: { key: 'auth.email' },
      name: 'email',
      type: 'email',
      value: user?.email ?? '',
      autocomplete: 'off',
      required: true,
    }),
  };
  if (!user) {
    fields.password = PasswordField({
      label: { key: 'auth.password' },
      name: 'password',
      autocomplete: 'new-password',
      helper: { key: 'auth.passwordHelper' },
      required: true,
    });
  }
  const role = Select({
    label: { key: 'admin.users.columns.role' },
    name: 'role',
    value: user?.role ?? 'member',
    options: ROLES.map((value) => ({ value, label: { key: `roles.${value}` } })),
    disabled: own,
    helper: own ? { key: 'users.errors.selfDemote' } : undefined,
  });

  const schema = {
    fullName: [rules.required(), rules.maxLength(MAX_NAME_LENGTH)],
    email: [rules.required(), rules.email()],
    password: [rules.required(), rules.minLength(MIN_PASSWORD_LENGTH)],
  };

  return formDialog({
    title: { key: user ? 'admin.users.edit' : 'admin.users.add' },
    fields: [fields.fullName, fields.email, role, fields.password].filter(Boolean),
    onSubmit: async () => {
      const values = Object.fromEntries(
        Object.entries(fields).map(([name, field]) => [name, inputOf(field).value]),
      );
      const active = Object.fromEntries(Object.keys(fields).map((name) => [name, schema[name]]));
      const { valid, errors, firstInvalid } = validate(active, values);
      for (const [name, field] of Object.entries(fields)) {
        setFieldError(field, errors[name] ?? null);
      }
      if (!valid) {
        if (firstInvalid) inputOf(fields[firstInvalid]).focus();
        return false;
      }

      const input = {
        fullName: values.fullName,
        email: values.email,
        role: /** @type {import('../../types.js').Role} */ (refs(role).input.value),
      };
      try {
        return await (user
          ? updateUser(user.id, input)
          : createUser({ ...input, password: values.password }));
      } catch (error) {
        // A taken address belongs under the email field; anything else goes to the dialog's banner.
        if (!(error instanceof ApiError) || error.code !== 'email_taken') throw error;
        setFieldError(fields.email, { key: error.messageKey });
        inputOf(fields.email).focus();
        return false;
      }
    },
  });
}

async function add() {
  const user = await openUserForm();
  if (!user) return;
  toast({ tone: 'success', title: { key: 'admin.users.added' }, message: user.fullName });
  list.reload();
}

/** @param {User} user */
async function edit(user) {
  const saved = await openUserForm(user);
  if (!saved) return;
  toast({ tone: 'success', title: { key: 'admin.saved' }, message: saved.fullName });
  list.reload();
}

/** @param {User[]} selected The admin's own account is never deleted, even when it was ticked. */
async function remove(selected) {
  const users = selected.filter((user) => !isSelf(user.id));
  const skipped = users.length < selected.length;
  if (users.length === 0) {
    toast({ tone: 'error', title: { key: 'users.errors.selfDelete' } });
    return;
  }
  const [first] = users;
  const single = users.length === 1;

  const confirmed = await confirmDialog({
    title: single
      ? { key: 'admin.users.deleteTitle', params: { name: first.fullName } }
      : { key: 'admin.users.deleteManyTitle', params: { count: users.length } },
    message: { key: single ? 'admin.users.deleteText' : 'admin.users.deleteManyText' },
  });
  if (!confirmed) return;

  try {
    await Promise.all(users.map((user) => deleteUser(user.id)));
    toast({
      tone: 'success',
      title: single
        ? { key: 'admin.users.deleted' }
        : { key: 'admin.users.deletedMany', params: { count: users.length } },
      message: skipped ? { key: 'admin.users.selfSkipped' } : single ? first.fullName : undefined,
    });
  } catch (error) {
    const key = error instanceof ApiError ? error.messageKey : 'errors.unknown';
    toast({ tone: 'error', title: { key: 'states.errorTitle' }, message: { key } });
  }
  table.clearSelection();
  list.reload();
}

/** @param {User} user */
function nameCell(user) {
  return h(
    'span',
    { class: 'admin-name' },
    Avatar({ name: user.fullName }),
    user.fullName,
    isSelf(user.id) && Badge({ label: { key: 'admin.users.you' } }),
  );
}

/** @param {User} user */
function joinedCell(user) {
  const cell = h('span', { class: 'tnum' });
  const show = () => {
    cell.textContent = formatDate(user.createdAt.slice(0, 10));
  };
  show();
  whileConnected(cell, show);
  return cell;
}

/** @param {User} user */
function actions(user) {
  const remover = IconButton({
    icon: 'trash-2',
    label: { key: 'admin.deleteItem', params: { name: user.fullName } },
    size: 'sm',
    danger: true,
    onClick: () => remove([user]),
  });
  if (isSelf(user.id)) setDisabled(remover, true, { key: 'users.errors.selfDelete' });
  return [
    IconButton({
      icon: 'pencil',
      label: { key: 'admin.editItem', params: { name: user.fullName } },
      size: 'sm',
      onClick: () => edit(user),
    }),
    remover,
  ];
}

/** @type {import('../../../components/DataTable/DataTable.js').DataTableElement} */
let table;

const list = mountList({
  path: 'admin/users.html',
  defaultSort: { id: 'fullName', order: 'asc' },
  searchLabel: { key: 'admin.users.search' },
  searchPlaceholder: { key: 'admin.users.searchPlaceholder' },
  addButton: Button({ label: { key: 'admin.users.add' }, icon: 'plus', onClick: add }),
  load: (query) => listUsers(query),
  emptyState: (q) =>
    EmptyState({
      icon: 'search',
      title: { key: 'admin.users.noMatch.title', params: { q } },
      text: { key: 'admin.users.noMatch.text' },
    }),
  createTable: (sort, onSort) => {
    table = DataTable({
      label: { key: 'admin.users.tableLabel' },
      rowId: (user) => user.id,
      sort,
      onSort,
      selection: {
        nameOf: (user) => user.fullName,
        actions: (ids) => [
          Button({
            label: { key: 'common.delete' },
            variant: 'ghost',
            size: 'sm',
            icon: 'trash-2',
            onClick: () => remove(list.rows().filter((user) => ids.includes(user.id))),
          }),
        ],
      },
      columns: [
        {
          id: 'fullName',
          label: { key: 'auth.fullName' },
          sortable: true,
          primary: true,
          render: nameCell,
        },
        { id: 'email', label: { key: 'auth.email' }, sortable: true, render: (user) => user.email },
        {
          id: 'role',
          label: { key: 'admin.users.columns.role' },
          sortable: true,
          render: (user) =>
            Badge({
              label: { key: `roles.${user.role}` },
              tone: user.role === 'admin' ? 'primary' : 'neutral',
            }),
        },
        {
          id: 'createdAt',
          label: { key: 'admin.users.columns.joined' },
          sortable: true,
          render: joinedCell,
        },
        {
          id: 'actions',
          label: { key: 'table.actions' },
          hideLabel: true,
          kind: 'actions',
          render: actions,
        },
      ],
    });
    return table;
  },
});
