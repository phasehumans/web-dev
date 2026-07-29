# Contributing to December

Thank you for contributing to December. Follow the steps below to set up your environment, test your changes, and submit pull requests.

To get started, clone the repository, set up environment variables, and run database migrations:

```bash
git clone https://github.com/phasehumans/december.git
cd december
bun install
cp .env.example .env
bun db:migrate:dev
```

Use the following commands during local development:

- `bun dev` - Start development servers
- `bun dev:cli` - Run CLI application in watch mode
- `bun test` - Run unit and integration tests across packages
- `bun verify` - Validate TypeScript types, ESLint, Prettier formatting, and spelling
- `bun format` - Auto-format code with Prettier
- `bun lint:fix` - Auto-fix ESLint issues
- `bun db:studio` - Open Prisma Studio database inspector

To submit a pull request:

1. Create a branch off `main` using `username/branch-name` format (e.g. `git checkout -b chaitanya/feature-name`).
2. Write clean code with tests covering your changes.
3. Use Conventional Commits (`feat: ...`, `fix: ...`).
4. Ensure `bun verify` and `bun test` pass cleanly.
5. Open a Pull Request targeting `main` with a summary of changes.

If you face any difficulties or need help, contact us via email at `phasehumans@gmail.com` or reach out on [X / Twitter](https://x.com/phasehumans).
