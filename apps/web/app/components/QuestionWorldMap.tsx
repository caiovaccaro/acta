'use client';

import type { CountryOpinionDTO, Stance } from '@acta/shared';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { useState } from 'react';
import { getOutletLogoUrl } from '../../lib/utils/outletLogos';

const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface QuestionWorldMapProps {
  countries: CountryOpinionDTO[];
}

const stanceColor: Record<Stance, string> = {
  YesItSeemsSo: '#14532d', // dark green
  ProbablyYes: '#22c55e', // light green
  Unclear: '#d4d4d8', // neutral gray
  ProbablyNot: '#fb7185', // light red
  NoItDoesntSeemSo: '#b91c1c', // dark red
};

const fallbackColor = '#e4e4e7';

const stanceLabelMap: Record<Stance, string> = {
  YesItSeemsSo: 'Yes, it seems so',
  ProbablyYes: 'Probably yes',
  Unclear: 'Unclear',
  ProbablyNot: 'Probably not',
  NoItDoesntSeemSo: 'No, it doesn’t seem so',
};

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// world-atlas countries-110m uses ISO 3166-1 numeric id; map to alpha-2 for our API data
const ISO_NUMERIC_TO_ALPHA2: Record<string, string> = {
  '004': 'AF', '008': 'AL', '010': 'AQ', '012': 'DZ', '032': 'AR', '036': 'AU', '040': 'AT', '044': 'BS',
  '048': 'BH', '050': 'BD', '051': 'AM', '052': 'BB', '056': 'BE', '064': 'BT', '068': 'BO', '070': 'BA',
  '072': 'BW', '076': 'BR', '084': 'BZ', '096': 'BN', '100': 'BG', '104': 'MM', '108': 'BI', '112': 'BY',
  '116': 'KH', '120': 'CM', '124': 'CA', '140': 'CF', '144': 'LK', '148': 'TD', '152': 'CL', '156': 'CN',
  '158': 'TW', '170': 'CO', '178': 'CG', '180': 'CD', '188': 'CR', '191': 'HR', '192': 'CU', '196': 'CY',
  '203': 'CZ', '204': 'BJ', '208': 'DK', '214': 'DO', '218': 'EC', '222': 'SV', '226': 'GQ', '231': 'ET',
  '232': 'ER', '233': 'EE', '238': 'FK', '242': 'FJ', '246': 'FI', '250': 'FR', '260': 'TF', '262': 'DJ',
  '266': 'GA', '268': 'GE', '270': 'GM', '275': 'PS', '276': 'DE', '288': 'GH', '300': 'GR', '304': 'GL',
  '308': 'GD', '320': 'GT', '324': 'GN', '328': 'GY', '332': 'HT', '340': 'HN', '348': 'HU', '352': 'IS',
  '356': 'IN', '360': 'ID', '364': 'IR', '368': 'IQ', '372': 'IE', '376': 'IL', '380': 'IT', '384': 'CI',
  '388': 'JM', '392': 'JP', '398': 'KZ', '400': 'JO', '404': 'KE', '408': 'KP', '410': 'KR', '414': 'KW',
  '417': 'KG', '418': 'LA', '422': 'LB', '426': 'LS', '428': 'LV', '430': 'LR', '434': 'LY', '440': 'LT',
  '442': 'LU', '450': 'MG', '454': 'MW', '458': 'MY', '466': 'ML', '478': 'MR', '484': 'MX', '498': 'MD',
  '499': 'ME', '504': 'MA', '508': 'MZ', '512': 'OM', '516': 'NA', '520': 'NR', '524': 'NP', '528': 'NL',
  '540': 'NC', '548': 'VU', '554': 'NZ', '558': 'NI', '562': 'NE', '566': 'NG', '578': 'NO', '583': 'FM',
  '586': 'PK', '591': 'PA', '598': 'PG', '600': 'PY', '604': 'PE', '608': 'PH', '616': 'PL', '620': 'PT',
  '624': 'GW', '626': 'TL', '634': 'QA', '642': 'RO', '643': 'RU', '646': 'RW', '682': 'SA', '686': 'SN',
  '688': 'RS', '694': 'SL', '703': 'SK', '704': 'VN', '705': 'SI', '706': 'SO', '710': 'ZA', '716': 'ZW',
  '724': 'ES', '728': 'SS', '729': 'SD', '732': 'EH', '740': 'SR', '748': 'SZ', '752': 'SE', '756': 'CH',
  '760': 'SY', '762': 'TJ', '764': 'TH', '768': 'TG', '776': 'TO', '780': 'TT', '784': 'AE', '788': 'TN',
  '792': 'TR', '795': 'TM', '800': 'UG', '804': 'UA', '807': 'MK', '818': 'EG', '826': 'GB', '834': 'TZ',
  '840': 'US', '854': 'BF', '858': 'UY', '860': 'UZ', '862': 'VE', '887': 'YE', '894': 'ZM',
};

export function QuestionWorldMap({ countries }: QuestionWorldMapProps) {
  const mapByIso2 = new Map<string, CountryOpinionDTO>();
  countries.forEach((c) => {
    mapByIso2.set(c.countryCode.toUpperCase(), c);
  });

  const [hovered, setHovered] = useState<{
    countryName: string;
    country?: CountryOpinionDTO;
  } | null>(null);

  return (
    <div className="relative rounded-xl border border-border-light bg-white px-3 pt-4 pb-5 md:px-4 md:pt-5 md:pb-6 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-text-muted">
            Global stance concentration
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Where publications are taking clearer positions on this question.
          </p>
        </div>
      </div>
      <div className="relative z-0 w-full max-h-[260px] md:max-h-[330px] overflow-hidden">
        <ComposableMap
          projectionConfig={{ scale: 140 }}
          width={800}
          height={360}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                // world-atlas 110m uses numeric id (ISO 3166-1); some datasets have iso_a2/ISO_A2
                const props = geo.properties as Record<string, unknown>;
                const numericId = geo.id != null ? String(geo.id) : null;
                const isoA2 =
                  (props?.iso_a2 as string) ||
                  (props?.ISO_A2 as string) ||
                  (numericId && ISO_NUMERIC_TO_ALPHA2[numericId]) ||
                  numericId;
                const country = isoA2 ? mapByIso2.get(String(isoA2).toUpperCase()) : undefined;

                let fill = fallbackColor;
                if (country && country.dominantStance) {
                  const base = stanceColor[country.dominantStance];
                  // Use a non-linear curve so high dominance pops and low dominance is very faint.
                  const raw = Math.max(0, Math.min(1, country.dominanceRatio ?? 1));
                  const strength = raw * raw; // square to accentuate differences
                  const alpha = 0.05 + strength * 0.95; // 0.05–1.0 range
                  fill = hexToRgba(base, alpha);
                }

                const countryName =
                  (props?.name as string) ||
                  (props?.NAME as string) ||
                  (isoA2 as string) ||
                  '';
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={0.4}
                    onMouseEnter={() =>
                      setHovered({
                        countryName,
                        country: country ?? undefined,
                      })
                    }
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', opacity: 0.9 },
                      pressed: { outline: 'none' },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-border-light bg-white px-3 py-2 text-[11px] md:text-xs shadow-sm h-20 overflow-hidden relative z-10">
        <div className="flex flex-col flex-1 overflow-hidden">
          {hovered ? (
            <>
              <span className="font-semibold text-text-main">
                {hovered.countryName || 'Unknown country'}
              </span>
              {hovered.country && hovered.country.outlets && hovered.country.outlets.length > 0 ? (
                <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                  {hovered.country.outlets.slice(0, 4).map((outlet) => (
                    <div key={outlet.outletName} className="flex items-center gap-2 min-w-0">
                      <img
                        src={getOutletLogoUrl(outlet.outletName)}
                        alt={outlet.outletName}
                        className="h-5 w-5 rounded-full bg-white object-cover ring-1 ring-border-light"
                      />
                      <span className="text-text-main font-medium truncate">
                        {outlet.outletName}
                      </span>
                      <span className="text-text-muted">
                        {stanceLabelMap[outlet.stance]}
                      </span>
                    </div>
                  ))}
                  {hovered.country.outlets.length > 4 && (
                    <span className="text-text-muted">
                      +{hovered.country.outlets.length - 4} more publication
                      {hovered.country.outlets.length - 4 > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-text-muted mt-1">
                  No clear publications for this country yet.
                </span>
              )}
            </>
          ) : (
            <>
              <span className="font-semibold text-text-main">Explore coverage by country</span>
              <span className="text-text-muted">
                Move your cursor over a country to see which publications are shaping the coverage there.
              </span>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] md:text-xs text-text-muted">
        <LegendSwatch color={stanceColor.YesItSeemsSo} label="Yes, it seems so" />
        <LegendSwatch color={stanceColor.ProbablyYes} label="Probably yes" />
        <LegendSwatch color={stanceColor.Unclear} label="Unclear" />
        <LegendSwatch color={stanceColor.ProbablyNot} label="Probably not" />
        <LegendSwatch color={stanceColor.NoItDoesntSeemSo} label="No, it doesn’t seem so" />
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-1">
      <span
        className="inline-block h-2 w-3 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}

