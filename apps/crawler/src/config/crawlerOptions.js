const MAX_ARTICLES_FLAG = '--max-articles';
const OUTLETS_FLAG = '--outlets';

function readFlagValue(argv, index, flag) {
    const token = argv[index];
    if (token.startsWith(`${flag}=`)) {
        return { value: token.slice(flag.length + 1), consumed: 0 };
    }
    if (token === flag) {
        if (index + 1 >= argv.length || argv[index + 1].startsWith('--')) {
            throw new Error(`${flag} requires a value`);
        }
        return { value: argv[index + 1], consumed: 1 };
    }
    return null;
}

function parseArticleCap(rawValue) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        throw new Error(
            'A finite article cap is required; pass --max-articles=<non-negative integer>',
        );
    }

    const value = Number(rawValue);
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error('--max-articles must be a non-negative safe integer');
    }
    return value;
}

function splitOutletNames(values) {
    return values
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter(Boolean);
}

/**
 * Parses the primary crawler CLI without reading or writing external state.
 *
 * Legacy positional outlet names remain supported, but the extraction cap is
 * always explicit through --max-articles or MAX_ARTICLES_PER_RUN.
 */
export function parseCrawlerArgs(
    argv = process.argv.slice(2),
    env = process.env,
) {
    let maxArticlesRaw;
    const outletValues = [];

    for (let index = 0; index < argv.length; index += 1) {
        const maxArticles = readFlagValue(argv, index, MAX_ARTICLES_FLAG);
        if (maxArticles) {
            if (maxArticlesRaw !== undefined) {
                throw new Error('--max-articles may only be specified once');
            }
            maxArticlesRaw = maxArticles.value;
            index += maxArticles.consumed;
            continue;
        }

        const outlets = readFlagValue(argv, index, OUTLETS_FLAG);
        if (outlets) {
            outletValues.push(outlets.value);
            index += outlets.consumed;
            while (
                index + 1 < argv.length
                && !argv[index + 1].startsWith('--')
            ) {
                outletValues.push(argv[index + 1]);
                index += 1;
            }
            continue;
        }

        if (argv[index].startsWith('--')) {
            throw new Error(`Unsupported crawler argument: ${argv[index]}`);
        }
        outletValues.push(argv[index]);
    }

    return {
        outletNames: splitOutletNames(outletValues),
        maxArticles: parseArticleCap(
            maxArticlesRaw ?? env.MAX_ARTICLES_PER_RUN,
        ),
    };
}

/**
 * Resolves requested names against a stable catalog before mutation begins.
 */
export function resolveSelectedOutlets(outletNames, catalog) {
    if (!Array.isArray(catalog) || catalog.length === 0) {
        throw new Error('No crawler outlets are configured');
    }

    const sortedCatalog = [...catalog].sort((left, right) =>
        left.name.localeCompare(right.name),
    );
    const byNormalizedName = new Map();
    for (const outlet of sortedCatalog) {
        const normalized = outlet.name.trim().toLocaleLowerCase('en-US');
        const matches = byNormalizedName.get(normalized) ?? [];
        matches.push(outlet);
        byNormalizedName.set(normalized, matches);
    }

    if (outletNames.length === 0) {
        return sortedCatalog;
    }

    const requested = new Set();
    const selected = [];
    for (const requestedName of outletNames) {
        const normalized = requestedName.trim().toLocaleLowerCase('en-US');
        if (requested.has(normalized)) {
            throw new Error(`Outlet specified more than once: ${requestedName}`);
        }
        requested.add(normalized);

        const matches = byNormalizedName.get(normalized) ?? [];
        if (matches.length !== 1) {
            const reason = matches.length === 0 ? 'Unknown' : 'Ambiguous';
            throw new Error(
                `${reason} outlet "${requestedName}". Available outlets: ${sortedCatalog
                    .map((outlet) => outlet.name)
                    .join(', ')}`,
            );
        }
        selected.push(matches[0]);
    }

    return selected.sort((left, right) => left.name.localeCompare(right.name));
}
