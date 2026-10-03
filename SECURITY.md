# Security

Do not open issues that include secrets, production connection strings, or personal account credentials.

## Reporting

Email the maintainer listed in `package.json` with a description of the issue. Do not file a public GitHub issue for credential leaks.

## Secrets

- Copy `.env.example` to `.env`. Never commit `.env`, dumps, or session stores.
- Outlet paywall logins belong in environment variables only.
- SQL backups in `backups/` are gitignored. Do not add them to git.
