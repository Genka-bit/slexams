/* Public views and share links. No account, login or likes. */
(() => {
    'use strict';
    const API = 'https://slexams-upload.genkaweb.workers.dev/api/views';
    const ORIGIN = 'https://slexams.site';
    const root = new URL('/', location.href);
    const DETAIL_PAGES = new Set(['paper.html', 'news-detail.html', 'scheme-view.html', 'app-detail.html']);

    function keyFor(value) {
        const url = new URL(value, root);
        const page = url.pathname.split('/').pop();
        const keys = page === 'paper.html' ? ['grade', 'stream', 'subject', 'term', 'type', 'paper']
            : page === 'scheme-view.html' ? ['grade', 'subject'] : ['id'];
        return page + '?' + keys.map(key => {
            let value = url.searchParams.get(key) || '';
            if (page === 'paper.html' && key === 'type') value ||= 'paper';
            if (page === 'paper.html' && key === 'term' && url.searchParams.get('type') === 'worksheet') value = '';
            return encodeURIComponent(key) + '=' + encodeURIComponent(value);
        }).join('&');
    }

    function renderActions(record) {
        let host = document.getElementById('contentActions');
        if (!host) {
            host = document.createElement('div');
            host.id = 'contentActions';
            const anchor = document.querySelector('.hero, #appDetail, #newsDetail, #paperTitle');
            if (!anchor) return;
            anchor.insertAdjacentElement('afterend', host);
        }
        host.className = 'content-actions';
        const views = document.createElement('span');
        views.className = 'content-views';
        views.textContent = '👁️ Views: …';
        const status = document.createElement('span');
        status.className = 'share-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        const shareURL = ORIGIN + record.path + (record.shareVersion ? '?share=' + encodeURIComponent(record.shareVersion) : '');
        const text = record.title + '\n' + shareURL;
        const link = (label, url) => {
            const element = document.createElement('a');
            element.textContent = label;
            element.setAttribute('href', url);
            element.target = '_blank';
            element.rel = 'noopener noreferrer';
            return element;
        };
        host.append(views,
            link('WhatsApp', 'https://wa.me/?text=' + encodeURIComponent(text)),
            link('Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareURL)));
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = 'Copy Link';
        copy.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareURL);
                status.textContent = 'Link copied / இணைப்பு நகலெடுக்கப்பட்டது';
            } catch {
                const input = document.createElement('input');
                input.value = shareURL;
                input.readOnly = true;
                input.setAttribute('aria-label', 'Share link — select and copy');
                host.append(input);
                input.focus();
                input.select();
                status.textContent = 'Select and copy this link';
            }
        });
        host.append(copy);
        if (navigator.share) {
            const share = document.createElement('button');
            share.type = 'button';
            share.textContent = 'Share';
            share.addEventListener('click', async () => {
                try { await navigator.share({ title: record.title, text: record.title, url: shareURL }); }
                catch (error) { if (error.name !== 'AbortError') status.textContent = 'Please use WhatsApp, Facebook or Copy Link.'; }
            });
            host.append(share);
        }
        host.append(status);

        async function loadViews() {
            // Count once per resource per browser tab session. This is a view count, not unique people.
            const marker = 'slexams:view:' + record.id;
            let counted = false;
            try { counted = sessionStorage.getItem(marker) === '1'; } catch { /* Storage may be disabled. */ }
            try {
                const response = await fetch(API + '?id=' + encodeURIComponent(record.id), {
                    method: counted ? 'GET' : 'POST', cache: 'no-store'
                });
                if (!response.ok) throw new Error('View API unavailable');
                const result = await response.json();
                if (!result.success || !Number.isSafeInteger(result.views) || result.views < 0) throw new Error('Invalid count');
                if (!counted) { try { sessionStorage.setItem(marker, '1'); } catch { /* Optional storage. */ } }
                views.textContent = '👁️ Views: ' + result.views.toLocaleString();
            } catch {
                views.textContent = '👁️ Views unavailable';
            }
        }
        // Background tabs and link-preview crawlers should not count as student views.
        if (document.visibilityState === 'visible') loadViews();
        else document.addEventListener('visibilitychange', function onVisible() {
            if (document.visibilityState === 'visible') {
                document.removeEventListener('visibilitychange', onVisible);
                loadViews();
            }
        });
    }

    async function initialize() {
        const marker = document.querySelector('[data-content-id]');
        const page = location.pathname.split('/').pop();
        try {
            const response = await fetch(new URL('assets/data/content-index.json', root));
            if (!response.ok) return;
            const records = await response.json();
            const aliases = new Map();
            for (const record of records) for (const alias of record.aliases) aliases.set(keyFor(alias), record);
            const record = marker ? records.find(r => r.id === marker.dataset.contentId)
                : DETAIL_PAGES.has(page) ? aliases.get(keyFor(location.href)) : null;
            if (record) renderActions(record);

            // Existing dynamically rendered lists link to the static resource pages too.
            const rewrite = node => {
                const links = node.matches?.('a[href]') ? [node] : [];
                if (node.querySelectorAll) links.push(...node.querySelectorAll('a[href]'));
                for (const link of links) {
                    const url = new URL(link.href, root);
                    if (url.origin !== location.origin || !DETAIL_PAGES.has(url.pathname.split('/').pop())) continue;
                    const target = aliases.get(keyFor(url.href));
                    if (target) link.href = target.path;
                }
            };
            rewrite(document.body);
            new MutationObserver(mutations => {
                for (const mutation of mutations) for (const node of mutation.addedNodes) if (node.nodeType === 1) rewrite(node);
            }).observe(document.body, { childList: true, subtree: true });
        } catch (error) {
            console.warn('Share features temporarily unavailable', error);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
})();
