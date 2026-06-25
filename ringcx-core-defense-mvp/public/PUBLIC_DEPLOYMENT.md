# Public Deployment

This project uses two delivery tracks:

- GitLab repository: source code, documentation, commit history, and challenge evidence.
- Public static host: low-friction playable URL for players and reviewers.

## Build The Static Package

From the repository root:

```bash
sh tools/build_gitlab_pages.sh
```

This generates:

```text
public/
├── index.html
├── std/
├── hi/
├── docs/
├── assets/
└── review-mockups/
```

## Option A: Netlify Drop

1. Open `https://app.netlify.com/drop`.
2. Drag the generated `public/` folder into the page.
3. Wait for Netlify to return a public URL.
4. Test these paths:

```text
https://<netlify-site>/
https://<netlify-site>/std/
https://<netlify-site>/hi/
https://<netlify-site>/docs/product-architecture-interactive.html
```

## Option B: Cloudflare Pages Direct Upload

1. Create a Cloudflare Pages project.
2. Choose direct upload.
3. Upload the generated `public/` folder.
4. Test the same paths.

## What To Share

Share both links when submitting or demoing:

```text
Source / documentation:
https://git.ringcentral.com/rc-ai-learning/sven-liu-ringcx-tower-defense

Playable demo:
https://<public-site>/
```

## Notes

- Do not commit credentials or tokens.
- Treat the public URL as externally visible.
- Rebuild and re-upload `public/` after each gameplay or website update.
