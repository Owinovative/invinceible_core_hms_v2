This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser when using the repository's default local frontend port.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

The frontend can remain on Vercel while Render is validated, or run as a Render Node web service with:

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Required public env: `NEXT_PUBLIC_API_BASE_URL`
- Required public app URL: `NEXT_PUBLIC_APP_URL`

See [../docs/deployment/render.md](../docs/deployment/render.md) for Render production migration details. Check the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for framework-level deployment behavior.
