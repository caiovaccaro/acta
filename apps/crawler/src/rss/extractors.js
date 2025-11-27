/**
 * RSS and Atom feed extraction utilities
 */

/**
 * Extract category/section from RSS item
 * @param {Function} $item - Cheerio item element
 * @param {Function} $ - Cheerio loader function (same instance that created $item)
 * @returns {Array<string>} Array of category names
 */
function extractCategories($item, $) {
    const categories = [];
    
    if (!$item || !$item.find || !$) {
        return categories; // Return empty if $item is not a valid Cheerio instance
    }
    
    // RSS 2.0: <category> tags
    $item.find('category').each((i, el) => {
        if (el) {
            // Use the same Cheerio loader to wrap the element
            const $el = $(el);
            if ($el && $el.length > 0) {
                const category = $el.text().trim();
                if (category) {
                    categories.push(category);
                }
                // Also check domain attribute
                const domain = $el.attr('domain');
                if (domain) {
                    categories.push(domain);
                }
            }
        }
    });
    
    return categories;
}

/**
 * Extract category/section from Atom entry
 * @param {Function} $entry - Cheerio entry element
 * @param {Function} $ - Cheerio loader function (same instance that created $entry)
 * @returns {Array<string>} Array of category names
 */
function extractAtomCategories($entry, $) {
    const categories = [];
    
    if (!$entry || !$entry.find || !$) {
        return categories; // Return empty if $entry is not a valid Cheerio instance
    }
    
    // Atom: <category> tags with term attribute
    $entry.find('category').each((i, el) => {
        if (el) {
            // Use the same Cheerio loader to wrap the element
            const $el = $(el);
            if ($el && $el.length > 0) {
                const term = $el.attr('term');
                if (term) {
                    categories.push(term);
                }
            }
        }
    });
    
    return categories;
}

export function extractRSSItem($item, $) {
    const categories = extractCategories($item, $);
    
    // Extract link - try multiple methods as RSS feeds vary
    // Method 1: Direct child text content (most common in RSS 2.0)
    let link = $item.find('link').first().text().trim();
    
    // Method 2: If empty, try as attribute (some feeds use href)
    if (!link) {
        link = $item.find('link').first().attr('href') || '';
    }
    
    // Method 3: Try direct child access (sometimes find() doesn't work with certain XML structures)
    if (!link && $item[0]) {
        // Access direct children
        const children = $item[0].children || [];
        for (const child of children) {
            if (child && (child.name === 'link' || child.tagName === 'link')) {
                // Get text content or href attribute
                link = (child.children && child.children[0] && child.children[0].data) 
                    ? child.children[0].data.trim() 
                    : (child.attribs && child.attribs.href) 
                        ? child.attribs.href 
                        : '';
                if (link) break;
            }
        }
    }
    
    // Method 4: Fallback to guid if it's marked as permalink
    if (!link) {
        const guid = $item.find('guid').first();
        const isPermaLink = guid.attr('isPermaLink');
        if (isPermaLink === 'true' || isPermaLink === true || isPermaLink === '1') {
            link = guid.text().trim();
        }
    }
    
    return {
        title: $item.find('title').first().text().trim(),
        link: link,
        description: $item.find('description').first().text().trim(),
        pubDate: $item.find('pubDate').first().text().trim() || $item.find('date').first().text().trim(),
        categories, // Array of category tags
    };
}

export function extractAtomEntry($entry, $) {
    const categories = extractAtomCategories($entry, $);
    
    return {
        title: $entry.find('title').text().trim(),
        link: $entry.find('link').attr('href') || $entry.find('link').text().trim(),
        description: $entry.find('summary').text().trim(),
        pubDate: $entry.find('published').text().trim(),
        categories, // Array of category tags
    };
}

