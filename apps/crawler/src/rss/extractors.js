/**
 * RSS and Atom feed extraction utilities
 */

export function extractRSSItem($item) {
    return {
        title: $item.find('title').text().trim(),
        link: $item.find('link').text().trim(),
        description: $item.find('description').text().trim(),
        pubDate: $item.find('pubDate').text().trim(),
    };
}

export function extractAtomEntry($entry) {
    return {
        title: $entry.find('title').text().trim(),
        link: $entry.find('link').attr('href') || $entry.find('link').text().trim(),
        description: $entry.find('summary').text().trim(),
        pubDate: $entry.find('published').text().trim(),
    };
}

