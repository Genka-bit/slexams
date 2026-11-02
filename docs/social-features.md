# Resource views and social sharing

Each paper, worksheet, news article, scheme and application has a static page under
`/content/`. The build derives its ID from the resource identity, rather than its
position in a JSON array. PDF resources retain their identity when another paper
is inserted or deleted. For legacy news without an ID, the title and date identify
the item; editing either creates a new identity. Add explicit persistent `id`
fields for new news items when the upload Worker is next updated.

Resource pages include Open Graph and Twitter metadata in the initial HTML.
News/apps use a JPEG derivative of their existing image; PDF resources use
a derivative of the SLExam icon as a fallback. Share JPEGs retain the full image
with letterboxing, are no larger than 200 KB, and include image type/dimension
metadata. Original on-page images are preserved. Share URLs carry a metadata
version to distinguish newly generated cards from older cached previews. Existing query-based detail pages resolve the same IDs. Lists link to
the new static pages after the resource index has loaded.

## Publishing

1. In GitHub repository **Settings > Pages > Build and deployment**, select
   **GitHub Actions** as the Source.
2. Merge the feature pull request into `main`.
3. The **Build and deploy SLExam Pro** workflow validates the source, builds all
   resource pages, and deploys the complete site. The existing `CNAME` is copied.
4. Verify a paper, worksheet, news article, scheme and app on mobile. Confirm
   their view counters and share links. Check a shared URL's page source for
   `og:title`, `og:image`, and `og:description`, then test WhatsApp/Facebook.
   Their preview caches can retain an older image/title temporarily.

Every subsequent JSON upload to `main` triggers a new build, so newly uploaded
resources get their static pages without an extra admin step. GitHub Pages must
remain configured to use this workflow; publishing raw source from a branch
does not generate `content-index.json` or the resource pages.

## View count API

The deployed `slexams-upload` Worker exposes `GET` (read) and `POST` (increment)
at `/api/views?id=CONTENT_ID`. It uses the existing `STATS_DB` D1 binding and
`content_views` table. Browser writes require the origin `https://slexams.site`.
Do not deploy a frontend-only preview expecting production counter writes from
another origin to work.

The browser counts a resource once per tab session, using sessionStorage only to
avoid counting refreshes again. No account, login, like or persistent visitor
identifier is used. This is a view counter, not a count of unique people. A new
tab or disabled session storage can result in another view. Origin checking is
not bot authentication; additional rate limiting may be needed if abused.

The frontend waits until the page is visible to record a view. If the counter
API is unavailable, sharing and the resource itself still work. A failed write
is not automatically retried, since it may have reached the database even if
the response was lost. The user-created `test-check` row is not a resource view.

## Local validation

```sh
python -m pip install Pillow==12.3.0
python -m unittest discover -s tests -v
node --check assets/js/app.js
node --check assets/js/social.js
python scripts/build_site.py --output _site
```

Build tests verify stable IDs, static social metadata, sitemap entries, URL
validation and escaped article content. The repository's existing media files
are copied as-is. Image compression, replacing the sample Windows app entry,
real upload timestamps for the home recent lists, and an expanded offline
cache are separate follow-up work from the audit.
