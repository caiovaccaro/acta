import { describe, expect, it } from '@jest/globals';
import {
    parseCrawlerArgs,
    resolveSelectedOutlets,
} from '../config/crawlerOptions.js';

const catalog = [
    { name: 'Reuters' },
    { name: 'BBC' },
    { name: 'Politico' },
];

describe('bounded crawler arguments', () => {
    it('returns selected outlets and the exact cap', () => {
        const parsed = parseCrawlerArgs([
            '--outlets=Reuters,BBC',
            '--max-articles',
            '7',
        ], {});
        const selected = resolveSelectedOutlets(parsed.outletNames, catalog);

        expect(parsed.maxArticles).toBe(7);
        expect(selected.map(({ name }) => name)).toEqual(['BBC', 'Reuters']);
    });

    it('preserves a zero-work boundary', () => {
        expect(parseCrawlerArgs([
            '--max-articles=0',
            '--outlets',
            'Politico',
        ], {})).toEqual({
            outletNames: ['Politico'],
            maxArticles: 0,
        });
    });

    it('supports legacy positional outlet names with an explicit cap', () => {
        expect(parseCrawlerArgs([
            'BBC',
            'Reuters',
            '--max-articles=2',
        ], {})).toEqual({
            outletNames: ['BBC', 'Reuters'],
            maxArticles: 2,
        });
    });

    it.each([
        [[], {}, 'finite article cap is required'],
        [['--max-articles=-1'], {}, 'non-negative safe integer'],
        [['--max-articles=Infinity'], {}, 'non-negative safe integer'],
        [['--max-articles=1.5'], {}, 'non-negative safe integer'],
        [['--max-articles'], {}, 'requires a value'],
    ])('rejects an invalid or missing cap', (argv, env, message) => {
        expect(() => parseCrawlerArgs(argv, env)).toThrow(message);
    });

    it('accepts a finite environment cap without treating zero as absent', () => {
        expect(parseCrawlerArgs([], { MAX_ARTICLES_PER_RUN: '0' })).toEqual({
            outletNames: [],
            maxArticles: 0,
        });
    });

    it('rejects unknown outlets and lists canonical names', () => {
        expect(() => resolveSelectedOutlets(['Unknown'], catalog)).toThrow(
            'Unknown outlet "Unknown". Available outlets: BBC, Politico, Reuters',
        );
    });

    it('rejects duplicate requested and ambiguous catalog names', () => {
        expect(() => resolveSelectedOutlets(['BBC', 'bbc'], catalog)).toThrow(
            'Outlet specified more than once',
        );
        expect(() => resolveSelectedOutlets(
            ['BBC'],
            [...catalog, { name: 'bbc' }],
        )).toThrow('Ambiguous outlet');
    });
});
