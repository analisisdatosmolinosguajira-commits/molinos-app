import React from 'react';

const ZONE_COLORS = {
    OK: { fill: '#22c55e', stroke: '#16a34a', label: 'Vigente' },
    EXPIRING: { fill: '#f59e0b', stroke: '#d97706', label: 'Por Vencer' },
    EXPIRED: { fill: '#ef4444', stroke: '#dc2626', label: 'Vencido' },
    MISSING: { fill: '#ef4444', stroke: '#dc2626', label: 'Sin EPP' },
    NONE: { fill: '#e2e8f0', stroke: '#cbd5e1', label: 'Sin Requisito' },
};

/**
 * Interactive person silhouette SVG with body zones for EPP status
 * @param {object} zones - { HEAD: { status, eppName, ... }, EYES: {...}, ... }
 * @param {function} onZoneClick - (zoneName, zoneData) => void
 * @param {number} width - SVG width
 */
export default function PersonSilhouette({ zones = {}, onZoneClick, width = 260 }) {
    const height = width * 1.7;

    const getZoneProps = (zoneName) => {
        const zone = zones[zoneName];
        const status = zone?.status || 'NONE';
        const colors = ZONE_COLORS[status] || ZONE_COLORS.NONE;
        const isInteractive = zone && status !== 'NONE';

        return {
            fill: colors.fill,
            stroke: colors.stroke,
            strokeWidth: 2,
            opacity: 0.85,
            cursor: isInteractive || zone ? 'pointer' : 'default',
            className: `transition-all duration-200 ${isInteractive ? 'hover:opacity-100 hover:scale-105' : ''}`,
            onClick: () => onZoneClick?.(zoneName, zone),
        };
    };

    const getLabel = (zoneName) => {
        const zone = zones[zoneName];
        if (!zone) return null;
        return zone.eppName || zoneName;
    };

    // Scale factors based on width
    const s = width / 260;

    return (
        <div className="relative inline-block">
            <svg width={width} height={height} viewBox="0 0 260 442" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Body outline (neutral gray) */}
                <g opacity="0.15">
                    {/* Full body silhouette background */}
                    <ellipse cx="130" cy="55" rx="35" ry="42" fill="#94a3b8" />
                    <rect x="95" y="95" width="70" height="120" rx="15" fill="#94a3b8" />
                    <rect x="55" y="100" width="40" height="12" rx="6" fill="#94a3b8" />
                    <rect x="165" y="100" width="40" height="12" rx="6" fill="#94a3b8" />
                    <rect x="40" y="100" width="20" height="85" rx="8" fill="#94a3b8" />
                    <rect x="200" y="100" width="20" height="85" rx="8" fill="#94a3b8" />
                    <rect x="100" y="215" width="25" height="150" rx="10" fill="#94a3b8" />
                    <rect x="135" y="215" width="25" height="150" rx="10" fill="#94a3b8" />
                    <ellipse cx="112" cy="380" rx="18" ry="10" fill="#94a3b8" />
                    <ellipse cx="148" cy="380" rx="18" ry="10" fill="#94a3b8" />
                </g>

                {/* === HEAD ZONE === */}
                <g {...getZoneProps('HEAD')}>
                    <ellipse cx="130" cy="50" rx="32" ry="38" />
                    {/* Hard hat shape */}
                    <path d="M98 35 Q130 5 162 35 Q165 25 130 15 Q95 25 98 35Z" />
                </g>

                {/* === EYES ZONE === */}
                <g {...getZoneProps('EYES')}>
                    <rect x="108" y="42" width="44" height="16" rx="8" />
                </g>

                {/* === EARS ZONE === */}
                <g {...getZoneProps('EARS')}>
                    <ellipse cx="96" cy="50" rx="8" ry="12" />
                    <ellipse cx="164" cy="50" rx="8" ry="12" />
                </g>

                {/* === FACE ZONE (mask) === */}
                <g {...getZoneProps('FACE')}>
                    <path d="M110 62 Q130 85 150 62 Q145 72 130 75 Q115 72 110 62Z" />
                </g>

                {/* === TORSO ZONE === */}
                <g {...getZoneProps('TORSO')}>
                    <rect x="98" y="96" width="64" height="105" rx="12" />
                    {/* Vest lines */}
                    <line x1="130" y1="96" x2="130" y2="200" stroke="white" strokeWidth="1" opacity="0.3" />
                </g>

                {/* === HANDS ZONE === */}
                <g {...getZoneProps('HANDS')}>
                    {/* Left arm + hand */}
                    <rect x="42" y="105" width="18" height="80" rx="9" />
                    <ellipse cx="51" cy="195" rx="14" ry="11" />
                    {/* Right arm + hand */}
                    <rect x="200" y="105" width="18" height="80" rx="9" />
                    <ellipse cx="209" cy="195" rx="14" ry="11" />
                </g>

                {/* === LEGS ZONE === */}
                <g {...getZoneProps('LEGS')}>
                    <rect x="102" y="205" width="22" height="140" rx="10" />
                    <rect x="136" y="205" width="22" height="140" rx="10" />
                </g>

                {/* === FEET ZONE === */}
                <g {...getZoneProps('FEET')}>
                    <path d="M94 352 Q112 345 118 352 L122 370 Q112 382 92 378 Z" />
                    <path d="M138 352 Q148 345 166 352 L168 378 Q148 382 138 370 Z" />
                </g>
            </svg>

            {/* Zone labels */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ fontSize: 10 * s }}>
                {zones.HEAD && (
                    <ZoneLabel x={0} y={0} label={getLabel('HEAD')} status={zones.HEAD.status} />
                )}
                {zones.EYES && (
                    <ZoneLabel x={width * 0.72} y={height * 0.08} label={getLabel('EYES')} status={zones.EYES.status} />
                )}
                {zones.TORSO && (
                    <ZoneLabel x={width * 0.72} y={height * 0.28} label={getLabel('TORSO')} status={zones.TORSO.status} />
                )}
                {zones.HANDS && (
                    <ZoneLabel x={0} y={height * 0.38} label={getLabel('HANDS')} status={zones.HANDS.status} />
                )}
                {zones.FEET && (
                    <ZoneLabel x={width * 0.72} y={height * 0.82} label={getLabel('FEET')} status={zones.FEET.status} />
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {Object.entries(ZONE_COLORS).filter(([k]) => k !== 'NONE').map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: val.fill }} />
                        <span className="text-[10px] text-slate-500">{val.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ZoneLabel({ x, y, label, status }) {
    const colors = ZONE_COLORS[status] || ZONE_COLORS.NONE;
    return (
        <div
            className="absolute px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shadow-sm"
            style={{
                left: x,
                top: y,
                backgroundColor: colors.fill + '22',
                color: colors.stroke,
                border: `1px solid ${colors.fill}55`,
            }}
        >
            {label}
        </div>
    );
}
