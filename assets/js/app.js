// ======================================
// SLExam Pro v5.1
// Final App.js
// ======================================

// ======================================
// Part 1 - URL Parameters + Database
// ======================================

function paginateList(container, selector, label) {
    const size = 10;
    let page = 0;
    let items = [];
    const nav = document.createElement("nav");
    nav.className = "list-pagination";
    nav.setAttribute("aria-label", label + " pages");
    const previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "← Previous";
    const status = document.createElement("span");
    status.setAttribute("aria-live", "polite");
    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "Next →";
    for (const button of [previous, next]) button.setAttribute("aria-controls", container.id);
    nav.append(previous, status, next);
    container.insertAdjacentElement("afterend", nav);
    function show(moveFocus) {
        const pages = Math.ceil(items.length / size);
        page = Math.max(0, Math.min(page, pages - 1));
        items.forEach((item, index) => {
            item.classList.add("list-page-item");
            item.hidden = index < page * size || index >= (page + 1) * size;
        });
        nav.hidden = items.length <= size;
        previous.disabled = page === 0;
        next.disabled = page >= pages - 1;
        status.textContent = `Page ${page + 1} of ${Math.max(1, pages)} · ${page * size + 1}–${Math.min((page + 1) * size, items.length)} of ${items.length}`;
        if (moveFocus) {
            container.setAttribute("tabindex", "-1");
            container.focus({ preventScroll: true });
            container.scrollIntoView({ block: "start", behavior: "auto" });
        }
    }
    function refresh() {
        items = Array.from(container.children).filter(item => item.matches(selector));
        page = 0;
        show(false);
    }
    previous.addEventListener("click", () => { if (page > 0) { page--; show(true); } });
    next.addEventListener("click", () => { if ((page + 1) * size < items.length) { page++; show(true); } });
    // Lists arrive asynchronously; observe cards, not changes to their attributes.
    if (typeof MutationObserver !== "undefined") new MutationObserver(refresh).observe(container, { childList: true });
    refresh();
    return { refresh };
}

function initializeListPagination() {
    for (const [id, selector, label] of [
        ["newsContainer", ".news-card", "News"],
        ["androidApps", ".app-card", "Android apps"],
        ["windowsApps", ".app-card", "Windows apps"],
        ["paperContainer", ".paper-list-item", "Papers and worksheets"]
    ]) {
        const container = document.getElementById(id);
        if (container) paginateList(container, selector, label);
    }
}

function setPageSEO(title, description, canonical) {
    document.title = String(title);
    const meta = (attribute, name, value) => {
        let element = document.querySelector(`meta[${attribute}="${name}"]`);
        if (!element) {
            element = document.createElement("meta");
            element.setAttribute(attribute, name);
            document.head.append(element);
        }
        element.setAttribute("content", name.includes("description") ? String(value).slice(0, 500) : String(value));
    };
    meta("name", "description", description);
    meta("property", "og:title", title);
    meta("property", "og:description", description);
    if (canonical) {
        const target = new URL(canonical);
        if (target.origin !== "https://slexams.site") return;
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement("link");
            link.setAttribute("rel", "canonical");
            document.head.append(link);
        }
        link.setAttribute("href", target.href);
        meta("property", "og:url", target.href);
    }
}

function initializeCategorySEO() {
    const page = (window.location.pathname || "").split("/").pop();
    if (!["grade.html", "stream.html", "subject.html", "term.html", "scheme-grades.html", "scheme-subjects.html"].includes(page)) return;
    const query = new URLSearchParams(window.location.search);
    const gradeValue = Number(query.get("grade"));
    const validGrade = Number.isInteger(gradeValue) && gradeValue >= 1 && gradeValue <= 13;
    const streamValue = (query.get("stream") || "").trim().slice(0, 200);
    const subjectValue = (query.get("subject") || "").trim().slice(0, 200);
    const levelValue = (query.get("level") || "").trim().slice(0, 100);
    const canonicalQuery = new URLSearchParams();
    let name;
    if (page.startsWith("scheme-")) {
        if (!validGrade && !levelValue) return;
        if (validGrade) canonicalQuery.set("grade", String(gradeValue));
        if (levelValue) canonicalQuery.set("level", levelValue);
        name = (validGrade ? `Grade ${gradeValue}` : levelValue) + " School Schemes";
    } else {
        if (!validGrade) return;
        canonicalQuery.set("grade", String(gradeValue));
        name = `Grade ${gradeValue}`;
        if (page !== "grade.html" && streamValue) {
            canonicalQuery.set("stream", streamValue);
            name += " " + streamValue;
        }
        if (["subject.html", "term.html"].includes(page)) {
            if (!subjectValue) return;
            canonicalQuery.set("subject", subjectValue);
            name += " " + subjectValue;
        }
        if (page === "term.html") {
            if (query.get("type") === "worksheet") {
                canonicalQuery.set("type", "worksheet");
                name += " Worksheets";
            } else {
                const termValue = query.get("term");
                if (!["1", "2", "3"].includes(termValue)) return;
                canonicalQuery.set("term", termValue);
                name += ` Term ${termValue} Exam Papers`;
            }
        } else name += " Exam Papers & Worksheets";
    }
    const description = `Browse ${name} on SLExam Pro. Find available Sri Lankan school resources for revision, learning and teaching.`;
    setPageSEO(name + " | SLExam Pro", description, "https://slexams.site/" + page + "?" + canonicalQuery.toString());
}

// Attribute strings for build-generated responsive media; originals remain fallbacks.
function responsiveImageAttributes(metadata, fallback, sizes) {
    const safeImageURL = value => {
        if (!value) return "";
        try {
            const target = new URL(value, document.baseURI);
            return ["https:", "http:"].includes(target.protocol) ? target.href : "";
        } catch { return ""; }
    };
    const sources = (Array.isArray(metadata?.sources) ? metadata.sources : [])
        .filter(item => Number.isInteger(item.width) && item.width > 0 && Number.isInteger(item.height) && item.height > 0 && safeImageURL(item.src))
        .sort((a, b) => a.width - b.width);
    if (!sources.length) {
        const original = safeImageURL(fallback);
        return original ? `src="${escapeSearchHTML(original)}" decoding="async"` : 'decoding="async"';
    }
    const chosen = sources.find(item => item.width >= 640) || sources[sources.length - 1];
    const srcset = sources.map(item => `${safeImageURL(item.src)} ${item.width}w`).join(", ");
    return `src="${escapeSearchHTML(safeImageURL(chosen.src))}" srcset="${escapeSearchHTML(srcset)}" sizes="${escapeSearchHTML(sizes)}" width="${chosen.width}" height="${chosen.height}" decoding="async"`;
}

const params = new URLSearchParams(window.location.search);

const grade = params.get("grade");
const stream = params.get("stream");
const subject = params.get("subject");
const term = params.get("term");
const paper = params.get("paper");
const type = params.get("type") || "paper";

let paperData = null;


// ======================================
// Load Grade JSON
// ======================================

async function loadData() {

    if (!grade) return null;

    if (paperData) return paperData;

    try {

        const response =
            await fetch(`assets/data/grade${grade}.json`);

        if (!response.ok) {
            throw new Error(
                `Cannot load grade${grade}.json`
            );
        }

        paperData = await response.json();

        return paperData;

    } catch (error) {

        console.error("Database Error:", error);

        return null;

    }

}


// ======================================
// Create Card
// ======================================

function createCard(title, link) {

    const a = document.createElement("a");

    a.className = "grade-card";

    a.href = link;

    a.textContent = title;

    return a;

}


// ======================================
// Empty Message
// ======================================

function showEmpty(container, message) {

    if (!container) return;

    container.innerHTML = `
        <div class="empty-message">
            ${message}
        </div>
    `;

}


// ======================================
// URL Encode
// ======================================

function url(value) {

    return encodeURIComponent(value || "");

}


// ======================================
// Get Papers
// ======================================

function getPapers(data, resourceType = "paper") {

    if (!data) return [];


    // ======================================
    // GRADE 1–11
    // ======================================

    if (data.subjects && subject) {

        const subjectData =
            data.subjects?.[subject];

        if (!subjectData) {
            return [];
        }


        // WORKSHEETS

        if (resourceType === "worksheet") {

            return Array.isArray(
                subjectData.worksheets
            )
                ? subjectData.worksheets
                : [];

        }


        // TERM PAPERS

        return (
            subjectData?.[term] || []
        );

    }


    // ======================================
    // GRADE 12–13
    // ======================================

    if (
        data.streamSubjects &&
        stream &&
        subject
    ) {

        const subjectData =
            data.streamSubjects
                ?. [stream]
                ?. [subject];

        if (!subjectData) {
            return [];
        }


        // WORKSHEETS

        if (resourceType === "worksheet") {

            return Array.isArray(
                subjectData.worksheets
            )
                ? subjectData.worksheets
                : [];

        }


        // TERM PAPERS

        return (
            subjectData?.[term] || []
        );

    }


    return [];

}

// ======================================
// Part 2 - Grade Page
// ======================================

async function loadGradePage() {

    const title =
        document.getElementById("gradeTitle");

    const container =
        document.getElementById("subjectContainer");

    if (!title || !container) return;

    const data = await loadData();

    if (!data) {

        showEmpty(
            container,
            "Unable to load Grade data."
        );

        return;

    }

    title.textContent = "Grade " + grade;

    container.innerHTML = "";


    // ==============================
    // Grade 12–13
    // ==============================

    if (data.streams) {

        data.streams.forEach(streamName => {

            container.appendChild(

                createCard(

                    streamName,

                    `stream.html?grade=${grade}&stream=${url(streamName)}`

                )

            );

        });

        return;

    }


    // ==============================
    // Grade 1–11
    // ==============================

    if (data.subjects) {

        Object.keys(data.subjects)
            .forEach(subjectName => {

                container.appendChild(

                    createCard(

                        subjectName,

                        `subject.html?grade=${grade}&subject=${url(subjectName)}`

                    )

                );

            });

        return;

    }

    showEmpty(
        container,
        "No Subjects Available"
    );

}


// ======================================
// Part 3 - Stream Page
// ======================================

async function loadStreamPage() {

    const title =
        document.getElementById("streamGradeTitle");

    const container =
        document.getElementById("streamContainer");

    if (!title || !container) return;

    const data = await loadData();

    if (
        !data ||
        !data.streamSubjects
    ) {

        showEmpty(
            container,
            "No Streams Found"
        );

        return;

    }

    title.textContent =
        `Grade ${grade} - ${stream}`;

    container.innerHTML = "";


    const subjects =
        data.streamSubjects?.[stream];


    if (!subjects) {

        showEmpty(
            container,
            "No Subjects Found"
        );

        return;

    }


    // IMPORTANT:
    // subjects is an Object,
    // therefore Object.keys() is required.

    Object.keys(subjects)
        .forEach(subjectName => {

            container.appendChild(

                createCard(

                    subjectName,

                    `subject.html?grade=${grade}&stream=${url(stream)}&subject=${url(subjectName)}`

                )

            );

        });

}


// ======================================
// Part 4 - Subject Page
// ======================================

function loadSubjectPage() {

    const title =
        document.getElementById("subjectTitle");

    if (!title) return;

    title.textContent = subject;


    const term1 =
        document.getElementById("term1");

    const term2 =
        document.getElementById("term2");

    const term3 =
        document.getElementById("term3");
const worksheet =
    document.getElementById("worksheet");

    if (term1) {

        term1.href =
            `term.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&term=1`;

    }


    if (term2) {

        term2.href =
            `term.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&term=2`;

    }


    if (term3) {

        term3.href =
            `term.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&term=3`;

    }

 if (worksheet) {

    worksheet.href =
        `term.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&type=worksheet`;

}

}


// ======================================
// Part 5 - Term Page
// ======================================

async function loadTermPage() {

    const title =
        document.getElementById("termTitle");

    const container =
        document.getElementById("paperContainer");

    if (!title || !container) return;

    if (type === "worksheet") {

    title.textContent =
        `${subject} - Worksheets / செயலட்டைகள்`;

} else {

    title.textContent =
        `${subject} - Term ${term}`;

}

    container.innerHTML = "";


    const data = await loadData();


    if (!data) {

        showEmpty(
            container,
            "Unable to load Grade data."
        );

        return;

    }


   const papers =
    getPapers(data, type);


    if (
        !Array.isArray(papers) ||
        papers.length === 0
    ) {

        showEmpty(
            container,
            "No Papers Available"
        );

        return;

    }


    papers.forEach((item, index) => {

        if (!item || !item.title) return;


        const link =
    type === "worksheet"

        ? `paper.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&type=worksheet&paper=${index}`

        : `paper.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&term=${term}&paper=${index}`;


const a =
    document.createElement("a");

a.className =
    "paper-list-item";

a.href =
    link;

a.innerHTML = `
    <span class="paper-list-icon">
        ${type === "worksheet" ? "📝" : "📄"}
    </span>

    <span class="paper-list-title">
        ${escapeSearchHTML(item.title)}
    </span>

    <span class="paper-list-arrow">
        ›
    </span>
`;

container.appendChild(a);

    });

}


// ======================================
// Part 6 - Paper Page
// ======================================

async function loadPaperPage() {

    const frame =
        document.getElementById("pdfFrame");

    const download =
        document.getElementById("downloadBtn");

    const title =
        document.getElementById("paperTitle");

    if (
        !frame ||
        !download ||
        !title
    ) return;


    const data =
        await loadData();


    if (!data) {

        title.textContent =
            "Grade Not Found";

        return;

    }


   const papers =
    getPapers(data, type);


    const paperIndex =
        Number.parseInt(paper, 10);


    if (
        Number.isNaN(paperIndex) ||
        paperIndex < 0 ||
        paperIndex >= papers.length
    ) {

        title.textContent =
            "Paper Not Found";

        frame.style.display = "none";

        download.style.display = "none";

        return;

    }


    const selectedPaper =
        papers[paperIndex];


    if (
        !selectedPaper ||
        !selectedPaper.pdf
    ) {

        title.textContent =
            "PDF Not Available";

        frame.style.display = "none";

        download.style.display = "none";

        return;

    }


    // Original paper title
    title.textContent =
        selectedPaper.title;
    document.title = selectedPaper.title + " | SLExam Pro";


    // PDF Viewer
    frame.src =
        selectedPaper.pdf;


    // Download
    download.href =
        selectedPaper.pdf;


    // Use original title
    download.download =
        `${selectedPaper.title}.pdf`;

}

// ======================================
// Part 7 - Universal Search
// ======================================

async function initializeSearch() {

    const input =
        document.getElementById("searchInput");

    const button =
        document.getElementById("searchBtn");

    if (!input || !button) {
        return;
    }

    // ==================================
    // CREATE SEARCH RESULT BOX
    // ==================================

    let resultBox =
        document.getElementById("searchResults");

    if (!resultBox) {

        resultBox =
            document.createElement("div");

        resultBox.id =
            "searchResults";

        resultBox.className =
            "search-results";

        const searchBox =
            document.querySelector(".search-box");

        if (searchBox) {
            searchBox.after(resultBox);
        }

    }


    // ==================================
    // SEARCH FUNCTION
    // ==================================

    async function performSearch() {

        const value =
            input.value
                .trim()
                .toLowerCase();

        if (!value) {

            resultBox.innerHTML = "";

            resultBox.style.display =
                "none";

            return;

        }


        resultBox.style.display =
            "block";

        resultBox.innerHTML =
            "<p>🔎 Searching...</p>";


        const results = [];


        // ==================================
        // GRADE SEARCH
        // ==================================

        const gradeMatch =
            value.match(/grade\s*(\d+)/i);

        if (gradeMatch) {

            const searchedGrade =
                Number.parseInt(
                    gradeMatch[1],
                    10
                );

            if (
                searchedGrade >= 1 &&
                searchedGrade <= 13
            ) {

                results.push({

                    type: "📚 Grade",

                    title:
                        `Grade ${searchedGrade}`,

                    link:
                        `grade.html?grade=${searchedGrade}`

                });

            }

        }


        // ==================================
        // SUBJECT / PAPER SEARCH
        // ==================================

        for (
            let g = 1;
            g <= 13;
            g++
        ) {

            try {

                const response =
                    await fetch(
                        `assets/data/grade${g}.json`
                    );

                if (!response.ok) {
                    continue;
                }

                const data =
                    await response.json();


                // ==================================
                // GRADE 1 - 11
                // ==================================

                if (data.subjects) {

                    for (
                        const subjectName
                        of Object.keys(
                            data.subjects
                        )
                    ) {

                        const subjectLower =
                            subjectName
                                .toLowerCase();


                        // Subject match

                        if (
                            subjectLower
                                .includes(value)
                        ) {

                            results.push({

                                type: "📚 Subject",

                                title:
                                    `Grade ${g} - ${subjectName}`,

                                link:
                                    `subject.html?grade=${g}&subject=${encodeURIComponent(subjectName)}`

                            });

                        }


                        // Papers

                        const terms =
                            data.subjects[
                                subjectName
                            ];


                        if (
                            !terms ||
                            typeof terms !==
                            "object"
                        ) {
                            continue;
                        }


                        for (
                            const termName
                            of Object.keys(terms)
                        ) {

                            const papers =
                                terms[termName];


                            if (
                                !Array.isArray(
                                    papers
                                )
                            ) {
                                continue;
                            }


                            papers.forEach(
                                (item, index) => {

                                    if (
                                        !item ||
                                        !item.title
                                    ) {
                                        return;
                                    }


                                    const paperTitle =
                                        item.title
                                            .toLowerCase();


                                    if (
                                        paperTitle
                                            .includes(value)
                                    ) {

                                        const termNumber =
                                            termName
                                                .match(/\d+/)
                                                ?. [0] ||
                                            termName;


                                        results.push({

                                            type:
                                                "📄 Paper",

                                            title:
                                                `Grade ${g} - ${item.title}`,

                                            link:
                                                `paper.html?grade=${g}&subject=${encodeURIComponent(subjectName)}&term=${termNumber}&paper=${index}`

                                        });

                                    }

                                }
                            );

                        }

                    }

                }


                // ==================================
                // GRADE 12 - 13 STREAMS
                // ==================================

                if (
                    data.streamSubjects
                ) {

                    for (
                        const streamName
                        of Object.keys(
                            data.streamSubjects
                        )
                    ) {

                        const subjects =
                            data.streamSubjects[
                                streamName
                            ];


                        if (
                            !subjects ||
                            typeof subjects !==
                            "object"
                        ) {
                            continue;
                        }


                        for (
                            const subjectName
                            of Object.keys(
                                subjects
                            )
                        ) {

                            if (
                                subjectName
                                    .toLowerCase()
                                    .includes(value)
                            ) {

                                results.push({

                                    type:
                                        "📚 Subject",

                                    title:
                                        `Grade ${g} - ${streamName} - ${subjectName}`,

                                    link:
                                        `subject.html?grade=${g}&stream=${encodeURIComponent(streamName)}&subject=${encodeURIComponent(subjectName)}`

                                });

                            }

                        }

                    }

                }

            }

            catch (error) {

                console.error(
                    `Search Grade ${g} Error:`,
                    error
                );

            }

        }


        // ==================================
        // NEWS
        // ==================================

        try {

            const response =
                await fetch(
                    `assets/data/news.json?v=${Date.now()}`
                );

            if (response.ok) {

                const data =
                    await response.json();

                const news =
                    Array.isArray(data.news)
                        ? data.news
                        : [];


                news.forEach(item => {

                    if (!item) {
                        return;
                    }

                    const title =
                        String(
                            item.title || ""
                        );


                    if (
                        title
                            .toLowerCase()
                            .includes(value)
                    ) {

                        results.push({

                            type:
                                "📰 News",

                            title:
                                title,

                            link:
                                "news.html"

                        });

                    }

                });

            }

        }

        catch (error) {

            console.error(
                "News Search Error:",
                error
            );

        }


        // ==================================
        // SCHEMES
        // ==================================

        try {

            const response =
                await fetch(
                    `assets/data/schemes.json?v=${Date.now()}`
                );

            if (response.ok) {

                const data =
                    await response.json();

                const schemes =
                    Array.isArray(
                        data.schemes
                    )
                        ? data.schemes
                        : [];


                schemes.forEach(item => {

                    if (!item) {
                        return;
                    }


                    const searchText =
                        (
                            item.title ||
                            ""
                        ).toLowerCase();


                    if (
                        searchText
                            .includes(value)
                    ) {

                        results.push({

                            type:
                                "📚 Scheme",

                            title:
                                item.title,

                            link:
                                "scheme.html"

                        });

                    }

                });

            }

        }

        catch (error) {

            console.error(
                "Scheme Search Error:",
                error
            );

        }


        // ==================================
        // EDUCATIONAL APPS
        // ==================================

        try {

            const response =
                await fetch(
                    `assets/data/apps.json?v=${Date.now()}`
                );

            if (response.ok) {

                const data =
                    await response.json();

                const apps =
                    Array.isArray(data.apps)
                        ? data.apps
                        : [];


                apps.forEach(item => {

                    if (!item) {
                        return;
                    }


                    const searchText =
                        (
                            item.name ||
                            ""
                        ).toLowerCase();


                    if (
                        searchText
                            .includes(value)
                    ) {

                        results.push({

                            type:
                                "📱 App",

                            title:
                                item.name,

                            link:
                                "apps.html"

                        });

                    }

                });

            }

        }

        catch (error) {

            console.error(
                "App Search Error:",
                error
            );

        }


        // ==================================
        // REMOVE DUPLICATES
        // ==================================

        const uniqueResults = [];

        const usedLinks =
            new Set();


        results.forEach(item => {

            if (
                !item ||
                !item.link
            ) {
                return;
            }


            const key =
                item.type +
                "|" +
                item.title +
                "|" +
                item.link;


            if (
                usedLinks.has(key)
            ) {
                return;
            }


            usedLinks.add(key);

            uniqueResults.push(item);

        });


        // ==================================
        // NO RESULTS
        // ==================================

        if (
            uniqueResults.length === 0
        ) {

            resultBox.innerHTML = `

                <div class="search-no-result">

                    🔍 No matching results found.

                </div>

            `;

            return;

        }


        // ==================================
        // SHOW RESULTS
        // ==================================

        resultBox.innerHTML =
            uniqueResults
                .slice(0, 30)
                .map(item => `

                    <a
                        href="${item.link}"
                        class="search-result-item"
                    >

                        <span class="search-result-type">
                            ${item.type}
                        </span>

                        <span class="search-result-title">
                            ${escapeSearchHTML(
                                item.title
                            )}
                        </span>

                    </a>

                `)
                .join("");

    }


    // ==================================
    // ENTER KEY
    // ==================================

    input.addEventListener(
        "keypress",
        event => {

            if (
                event.key === "Enter"
            ) {

                performSearch();

            }

        }
    );


    // ==================================
    // SEARCH BUTTON
    // ==================================

    button.addEventListener(
        "click",
        performSearch
    );

}


// ======================================
// SEARCH HTML ESCAPE
// ======================================

function escapeSearchHTML(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

// ======================================
// Part 8 - Auto Slider
// ======================================

function initializeSlider() {

    const slides =
        document.querySelectorAll(".slide");


    if (slides.length === 0) return;


    let current = 0;


    slides[current]
        .classList
        .add("active");


    setInterval(() => {

        slides[current]
            .classList
            .remove("active");


        current =
            (current + 1) % slides.length;


        slides[current]
            .classList
            .add("active");

    }, 4000);

}


// ======================================================
// Part 10.5 - Home Recent Updates
// ======================================================

async function loadHomeRecentUpdates() {
    const sections = [
        ["paper", "recentPapers", "📄"],
        ["worksheet", "recentWorksheets", "📝"],
        ["news", "recentNews", "📰"],
        ["scheme", "recentSchemes", "📚"],
        ["app", "recentApps", "📱"]
    ];
    const active = sections.filter(([, id]) => document.getElementById(id));
    if (!active.length) return;
    const message = (container, text) => {
        const paragraph = document.createElement("p");
        paragraph.className = "recent-meta";
        paragraph.textContent = text;
        container.replaceChildren(paragraph);
    };
    try {
        const response = await fetch("assets/data/recent-content.json", { cache: "no-cache" });
        if (!response.ok) throw new Error("Recent updates are unavailable");
        const feed = await response.json();
        const dateFormat = new Intl.DateTimeFormat("en-GB", {
            day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo"
        });
        for (const [kind, id, icon] of active) {
            const container = document.getElementById(id);
            const records = Array.isArray(feed[kind]) ? feed[kind] : [];
            const cards = [];
            for (const record of records.slice(0, 3)) {
                // The feed only links to generated pages on this site.
                if (!/^\/content\/[a-z]+-[a-f0-9]{64}\/$/.test(record.path || "")) continue;
                const added = new Date(record.addedAt);
                if (!Number.isFinite(added.getTime())) continue;
                const card = document.createElement("a");
                card.className = kind === "paper" || kind === "worksheet" ? "recent-item" : "recent-small recent-content-link";
                card.href = record.path;
                const left = document.createElement("span");
                left.className = "recent-item-left";
                const symbol = document.createElement("span");
                symbol.className = "recent-icon";
                symbol.textContent = icon;
                const text = document.createElement("span");
                const title = document.createElement("span");
                title.className = "recent-title";
                title.textContent = record.title;
                const meta = document.createElement("span");
                meta.className = "recent-meta";
                const time = document.createElement("time");
                time.dateTime = added.toISOString();
                time.textContent = "Added " + dateFormat.format(added);
                meta.append(time);
                text.append(title, meta);
                left.append(symbol, text);
                const arrow = document.createElement("span");
                arrow.className = "recent-arrow";
                arrow.textContent = "→";
                arrow.setAttribute("aria-hidden", "true");
                card.append(left, arrow);
                cards.push(card);
            }
            if (cards.length) container.replaceChildren(...cards);
            else message(container, "No recently added resources available.");
        }
    } catch (error) {
        console.warn("Recent updates:", error);
        for (const [, id] of active) {
            message(document.getElementById(id), "Recent updates could not be loaded. Please browse by grade or category.");
        }
    }
}

// ======================================
// Part 11 - Initialize
// ======================================

window.addEventListener(
    "DOMContentLoaded",
    () => {


        // Grade Page

        if (
            document.getElementById(
                "subjectContainer"
            )
        ) {

            loadGradePage();

        }


        // Stream Page

        if (
            document.getElementById(
                "streamContainer"
            )
        ) {

            loadStreamPage();

        }


        // Subject Page

        if (
            document.getElementById(
                "subjectTitle"
            )
        ) {

            loadSubjectPage();

        }


        // Term Page

        if (
            document.getElementById(
                "paperContainer"
            )
        ) {

            loadTermPage();

        }


        // Paper Page

        if (
            document.getElementById(
                "pdfFrame"
            )
        ) {

            loadPaperPage();

        }


        // Common Features

        initializeListPagination();

        initializeCategorySEO();

        loadHomeRecentUpdates();

initializeSearch();

initializeSlider();

// Header menu and theme controls are initialized by initHeaderControls below.

    }
);


// ======================================
// Global Error Handler
// ======================================

window.addEventListener(
    "error",
    event => {

        console.error(
            "SLExam Pro Error:",
            event.error
        );

    }
);

/* ==================================
   PROFESSIONAL HEADER CONTROLS
   ================================== */

(function () {

    function initHeaderControls() {

        const menuToggle =
            document.getElementById("menuToggle");

        const mainNav =
            document.getElementById("mainNav");

        const themeToggle =
            document.getElementById("themeToggle");


        /* ==================================
           MOBILE MENU
           ================================== */

        if (menuToggle && mainNav) {

            menuToggle.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    const isOpen =
                        mainNav.classList.toggle("active");

                    menuToggle.setAttribute(
                        "aria-expanded",
                        isOpen ? "true" : "false"
                    );

                    menuToggle.textContent =
                        isOpen ? "✕" : "☰";

                }
            );


            /* Close menu after clicking a link */

            mainNav
                .querySelectorAll("a")
                .forEach(function (link) {

                    link.addEventListener(
                        "click",
                        function () {

                            mainNav.classList.remove(
                                "active"
                            );

                            menuToggle.setAttribute(
                                "aria-expanded",
                                "false"
                            );

                            menuToggle.textContent = "☰";

                        }
                    );

                });

        }


        /* ==================================
           DARK MODE
           ================================== */

        if (themeToggle) {

            themeToggle.addEventListener(
                "click",
                function () {

                    document.body.classList.toggle(
                        "dark-mode"
                    );

                    const darkMode =
                        document.body.classList.contains(
                            "dark-mode"
                        );

                    localStorage.setItem(
                        "theme",
                        darkMode ? "dark" : "light"
                    );

                    themeToggle.textContent =
                        darkMode ? "☀️" : "🌙";

                }
            );


            /* Restore saved theme */

            const savedTheme =
                localStorage.getItem("theme");

            if (savedTheme === "dark") {

                document.body.classList.add(
                    "dark-mode"
                );

                themeToggle.textContent = "☀️";

            }

        }

    }


    /* ==================================
       INITIALIZE
       ================================== */

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initHeaderControls
        );

    } else {

        initHeaderControls();

    }

})();

/* ==================================
   EMAIL LINK
   ================================== */

(function () {

    const emailLink =
        document.getElementById("emailLink");

    if (!emailLink) {
        return;
    }

    const user = "genkaweb";
    const domain = "gmail.com";

    const email =
        user + "@" + domain;

    emailLink.href =
        "mailto:" + email;

})();
