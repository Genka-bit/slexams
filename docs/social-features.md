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
are copied as-is. Replacing the sample Windows app entry and expanding the offline cache remain
separate follow-up work from the audit.

## Recently added resources

The build reads complete first-parent Git history for the grade, news, scheme
and app JSON files. A resource gets the commit time at which its identity
appeared in that file. Editing/reordering an existing item preserves that time;
removing and re-adding it records the new addition. Exam years in filenames and
the publication date of a news story are never treated as upload timestamps.
These are repository publication times, not physical R2 upload timestamps.

The generated `assets/data/recent-content.json` contains the newest three dated
records in each category, across all grades. Home loads this single small feed,
shows dates in the Asia/Colombo timezone and links directly to stable resource
pages. Unknown upload dates are not guessed. Local builds without Git history
produce empty recent sections; CI must use `fetch-depth: 0`. Subsequent admin
uploads trigger the same pipeline and require no upload-Worker change.

## Responsive on-page media

The build generates WebP display variants at up to 320, 640, 960 and 1280
pixels wide for referenced local news and app images. Images retain their aspect
ratio and are never upscaled; source files are preserved. Content hashes version
the variant URLs. Static resource pages use srcset/sizes and intrinsic dimensions.

Deployed news/apps JSON gains optional image-variant metadata, while its original
image and preview-image fields stay intact. The matching legacy list/detail
templates consume the variants, so they do not first download the full original
image. Opening an app preview in the existing full-screen viewer still uses its
original image. Below-fold previews use lazy loading and async decoding.
WhatsApp/social metadata continues to use the previously verified JPEG derivatives.
Run `node tests/check_images.cjs` to check the shared attribute helper.

## SEO metadata and canonical URLs

The build writes distinct metadata and canonical URLs for home, category indexes
and information pages. Home uses the root URL as canonical. Grade, stream,
subject and term templates intentionally omit a generic static canonical; the
frontend sets it from the normalized valid query, removing empty/default and
tracking parameters. Legacy resource details canonicalize to their stable
`/content/` page when the content index resolves the resource.

Resource pages include a visible breadcrumb and matching BreadcrumbList JSON-LD.
News includes NewsArticle metadata and its supplied visible publication date.
No author, exact publication time, rating or review is invented: datePublished
is only emitted when the source supplies an ISO datetime with timezone. Home
provides WebSite/Organization metadata. AdSense and Monetag verification tags
are preserved when other head metadata is rewritten.

The sitemap is regenerated from preferred resource URLs, public static pages,
all grade navigation pages, streams and populated subject/term/worksheet lists.
Array-index resource aliases, search, admin and the obsolete viewer are omitted.
Admin/search/viewer HTML carries noindex,follow; robots.txt allows crawling so
that directive can be read. The noindex tag is not authentication. New content
uploads regenerate this sitemap automatically.

Validate runtime title/canonical normalization with `node tests/check_seo.cjs`.
After deployment, resubmit `https://slexams.site/sitemap.xml` in the existing
Search Console property and inspect representative resource/category URLs.
Canonical hints and structured data do not guarantee indexing or rich results.
