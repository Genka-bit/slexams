# Paper details and Google ad review

The shared paper/worksheet template renders only fields present in the grade JSON and its navigation context. The static resource page and the legacy paper.html page both show an accessible details table. Unknown year, publisher, medium, duration and page count are omitted. Do not infer them from upload dates, filenames or grade number.

Optional `paperDetails` on an existing grade JSON item:

```json
{
  "title": "A verified descriptive title",
  "pdf": "assets/pdf/example.pdf",
  "paperDetails": {
    "exam": "A verified exam label",
    "year": "2021 (2022)",
    "publisher": "The organization printed on the paper",
    "medium": "தமிழ்மூலம்",
    "durationMinutes": 120,
    "pages": 4
  }
}
```

All fields are optional. Duration and page count must be positive integers. The explicit exam label takes precedence over the directory's term label. Resource IDs and share URLs continue to depend on the PDF URL, so editing titles/details does not create a new resource. Existing view counts remain associated with the same ID.

Only the sample `assets/pdf/grade8/கணிதம்/term3/1-GR-8.pdf` has newly verified metadata in this change. Its four pages were visually checked: Mutur Zonal Education Office, Grade 8 Mathematics, final assessment 2021 (2022), two hours. No official answer key, licence, ownership or completeness claim is added.

## Current Google ad serving state

Google ad serving is paused across the site: the homepage's adsbygoogle loader, ad unit and initialization were removed. The AdSense account verification meta tag and ads.txt remain. No new Google ad loader is added to resource, navigation, empty or error pages. A regression check prevents reintroducing the loader or unit in source HTML without deliberately updating the check.

This also prevents that homepage loader from initiating Auto ads. Dashboard settings were not changed by this commit. Monetag scripts and existing non-Google ad placements are unchanged.

Before enabling Google ads again, manually review the actual page content and ad placement. A metadata table, repeated generic prose or a passing performance/SEO score does not establish substantial original value or guarantee approval. Add genuinely useful subject guidance or reviewed explanations where appropriate. Confirm rights for third-party materials. Re-enable only on individually reviewed substantive pages; keep navigation-only, PDF-only, loading, empty and error pages free of Google ad serving. Recheck Auto ads configuration as well as manual units before requesting another review.
