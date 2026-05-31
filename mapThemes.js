const islandColors = {
    backgroundStart: '#72d6f4',
    backgroundEnd: '#b9f0d8',
    hazeTop: 'rgba(255, 255, 255, 0.05)',
    hazeBottom: 'rgba(56, 166, 178, 0.13)',
    cloud: 'rgba(255, 255, 255, 0.7)',
    cloudSoft: 'rgba(255, 242, 221, 0.42)',
    hillColorFar: 'rgba(54, 135, 165, 0.25)',
    hillColorNear: 'rgba(43, 146, 124, 0.32)',
    hillColorFront: 'rgba(43, 101, 94, 0.24)',
    platformStyle: 'soft',
    platformTop: '#ffe9b7',
    platformBase: '#f5c774',
    platformEdge: '#ffd98e',
    platformLip: '#fff0bf',
    platformUnderside: '#c47f3d',
    platformSideShade: 'rgba(117, 62, 27, 0.22)',
    platformHighlight: 'rgba(255, 255, 255, 0.48)',
    platformStroke: 'rgba(133, 85, 37, 0.38)',
    platformShadow: 'rgba(59, 38, 26, 0.28)',
    playerBody: '#263747',
    playerBodyLight: '#3d5568',
    playerBodyDark: '#172432',
    playerStroke: 'rgba(4, 16, 28, 0.45)',
    playerBodyHighlight: 'rgba(255, 255, 255, 0.1)',
    playerShadow: 'rgba(24, 22, 18, 0.22)',
    player1Headband: '#23a7e6',
    player2Headband: '#f1584e',
    headbandHighlight: 'rgba(255, 255, 255, 0.8)',
    eyeWhite: '#ffffff',
    eyePupil: '#10141a',
    indicator: '#ffd447',
    indicatorGlow: 'rgba(255, 212, 71, 0.65)',
    cooldownTrack: 'rgba(18, 23, 30, 0.46)',
    borderColor: '#f5c876',
    decorShadow: 'rgba(67, 52, 35, 0.2)',
    palmTrunk: '#a66e45',
    palmTrunkDark: '#7b4d32',
    palmTrunkLight: '#d3935e',
    palmTrunkStripe: 'rgba(91, 54, 34, 0.28)',
    palmLeaves: '#4ec36f',
    palmLeavesDark: '#2f995b',
    palmCoconut: '#8a5a35',
    flash: 'rgba(255, 221, 89, 0.3)'
};

const cosmosColors = {
    ...islandColors,
    backgroundStart: '#0c0c0b',
    backgroundEnd: '#181714',
    platformStyle: 'cosmos',
    platformTop: '#4d463d',
    platformBase: '#282522',
    platformEdge: '#6c5736',
    platformLip: '#7b6744',
    platformUnderside: '#151312',
    platformSideShade: '#0f0d0c',
    platformHighlight: 'rgba(248, 220, 154, 0.55)',
    platformStroke: '#c18b45',
    platformShadow: 'transparent',
    playerBody: '#eed18b',
    playerBodyLight: '#fff4c7',
    playerBodyDark: '#b9823d',
    playerStroke: '#1d1408',
    playerBodyHighlight: 'rgba(255, 255, 255, 0.42)',
    playerShadow: 'transparent',
    headbandHighlight: '#fff8d9',
    eyeWhite: '#fffaf0',
    eyePupil: '#111111',
    indicator: '#fff1a8',
    indicatorGlow: 'transparent',
    cooldownTrack: 'rgba(20, 14, 8, 0.48)',
    borderColor: '#f0c66b',
    flash: 'rgba(255, 226, 145, 0.22)'
};

const bulbColors = {
    ...islandColors,
    backgroundStart: '#071012',
    backgroundEnd: '#101b1d',
    platformStyle: 'bulb',
    platformTop: '#ffb24a',
    platformBase: '#ff6819',
    platformEdge: '#ffd36e',
    platformLip: '#fff0a8',
    platformUnderside: '#4b1808',
    platformSideShade: 'rgba(42, 8, 2, 0.75)',
    platformHighlight: '#ffe9a8',
    platformStroke: '#ff7a1c',
    platformGlow: 'rgba(255, 92, 18, 0.86)',
    platformCore: '#ff8a25',
    platformHot: '#fff1a3',
    platformGlass: 'rgba(255, 99, 24, 0.14)',
    platformOuterGlow: 'rgba(255, 83, 17, 0.24)',
    platformShadow: 'transparent',
    playerStyle: 'chrome',
    playerBody: '#1b2526',
    playerBodyLight: '#8a9898',
    playerBodyDark: '#030607',
    playerStroke: '#ff8330',
    playerBodyHighlight: 'rgba(229, 248, 245, 0.72)',
    playerRim: 'rgba(255, 168, 76, 0.72)',
    playerGlow: 'rgba(255, 96, 24, 0.32)',
    playerShadow: 'rgba(255, 90, 22, 0.24)',
    player1Headband: '#36cfff',
    player2Headband: '#ff6a1d',
    headbandHighlight: '#fff3bc',
    headbandGlow: 'rgba(255, 104, 24, 0.75)',
    eyeWhite: '#f8ffff',
    eyePupil: '#070a0a',
    indicator: '#ff9a2b',
    indicatorGlow: 'rgba(255, 104, 24, 0.75)',
    cooldownTrack: 'rgba(10, 14, 14, 0.68)',
    borderColor: '#ff7a1c',
    flash: 'rgba(255, 106, 29, 0.2)'
};

export function createMapDecorations(mapId, worldWidth) {
    if (mapId === 'cosmos' || mapId === 'bulb') {
        return [];
    }

    return [
        { type: 'palm', platformLabel: 'platform-start-left', offsetX: -150 },
        { type: 'palm', platformLabel: 'platform-start-right', offsetX: 150 },
        { type: 'palm', platformLabel: 'platform-low-far-left', offsetX: 0 },
        { type: 'palm', platformLabel: 'platform-low-far-right', offsetX: 0 },
        { type: 'palm', platformLabel: 'platform-low-center', offsetX: -250 },
        { type: 'palm', platformLabel: 'platform-low-center', offsetX: 250 },
        { type: 'palm', platformLabel: 'platform-mid-center-left', offsetX: -100 },
        { type: 'palm', platformLabel: 'platform-mid-center-right', offsetX: 100 },
        { type: 'palm', platformLabel: 'platform-upper-mid-center', offsetX: -200 },
        { type: 'palm', platformLabel: 'platform-upper-mid-center', offsetX: 200 },
        { type: 'palm', platformLabel: 'platform-ground', offsetX: -worldWidth / 2 + 250 },
        { type: 'palm', platformLabel: 'platform-ground', offsetX: worldWidth / 2 - 250 }
    ];
}

export function createMapTheme(mapId, worldWidth) {
    if (mapId === 'bulb') {
        return {
            id: 'bulb',
            colors: bulbColors,
            pageBackgroundColor: '#05090a',
            cacheBackground: false,
            background: 'bulb',
            backgroundImageSrc: 'assets/bulb-texture-background.png',
            platformTextureSrc: null,
            decorations: createMapDecorations('bulb', worldWidth)
        };
    }

    if (mapId === 'cosmos') {
        return {
            id: 'cosmos',
            colors: cosmosColors,
            pageBackgroundColor: '#070707',
            cacheBackground: false,
            background: 'cosmos',
            backgroundImageSrc: 'assets/cosmos-paper-background-dark.png',
            platformTextureSrc: 'assets/cosmos-platform-texture.png',
            decorations: createMapDecorations('cosmos', worldWidth)
        };
    }

    return {
        id: 'islands',
        colors: islandColors,
        pageBackgroundColor: '#151820',
        cacheBackground: true,
        background: 'islands',
        backgroundImageSrc: null,
        platformTextureSrc: null,
        decorations: createMapDecorations('islands', worldWidth)
    };
}
