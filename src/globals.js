// Dev mode, only on the developer's computer: DEVMODE=true in its .env (never in the .env of the prod server).
// The bot then works in the channels of the private "🧪 claude-tests" category instead of the real ones,
// and never pings roles (members mentions still work).
// Without the variable the bot is in prod mode: nothing has to be switched by hand before a deployment.
const devMode = process.env.DEVMODE == `true`;

// Channels replaced by the ones of the test category in dev mode
const devChannels = {
    missionBoard: `1573650148519706726`, // experimental-board
    bloodClash: `1573650151409721384`, // bc-dev
    bcHelp: `1573650154299326514`, // bc-helper-dev
    bcCategory: `1573639980964913162`, // 🧪 claude-tests
    docs: `1573673044117954671`, // bot-docs
    tacCategory: `1573639980964913162` // 🧪 claude-tests
};

if(devMode) console.log(`[Dev mode] Test channels used, roles are never pinged`);

export const globals = {
    devMode: devMode,
    // Test mode: the bot never pings roles (members mentions still work)
    testMode: devMode,
    separator: `|||`,
    developer: {
        discord: {
            globalName: `@evileoo_`,
            id: `398358008838488077`
        },
    },
    server: {
        id: `1478130301552033982`,
        channel: {
            flow: `1478130659326300355`,
            rules: `1478130894563967058`,
            missionBoard: `1478133200109965497`,
            annoucements: `1481027774465708216`,
            general: `1478130580712460480`,
            villages: `1504080991273091143`,
            bloodClash: `1528779829686702250`,
            // 🤝・bc-helper: help requests list + helper commands
            bcHelp: `1551178331603603546`,
            // Category of the channels where Blood Clash help requests are filtered (server general)
            bcCategory: `1478130471585054893`,
            // Category of the helpers' lobbies (same in dev mode)
            bcLobbies: `1533555957009879211`,
            automod: `1542981838849577073`,
            tierlist: `1551315395410006196`,
            starboard: `1559211027235737680`,
            // Documentation forum (docs/posts, published with "npm run docs"), to create when the bot goes to prod
            docs: ``,
            // Category of the Tri-Army Clash shared channels. Empty: the bot uses (or creates) the "⚔️ Tri-Army Clash" category
            tacCategory: ``,
            ...(devMode ? devChannels : {})
        },
        role: {
            mod: `1483148976101396480`,
            kage: `1478134870247997723`,
            sub: `1478134948861841498`,
            member: `1495848176286957599`,
            lone: `1503787085172052088`,
            pingServer: `1479553348373057666`,
            pingArena: `1479552402863558727`,
            pingAuction: `1478135570696769638`,
            pingNinjaWar: `1478135456393597008`,
            bcHelper: `1528780090597707887`,
            bcHelp: `1531724876858265861`,
            restriction: `1531008532412104954`
        },
        member: {
            fill: ``
        }
    },
    embed: {
        red: 0xed4a4a,
        orange: 0xde8240,
        yellow: 0xd1cf3d,
        green: 0x73d138,
        cyan: 0x3bccc5,
        blue: 0x3985e3,
        purple: 0x934aed,
        pink: 0xe343e6,
        white: 0xe3e3e3,
        grey: 0x8f8f8f,
        black: 0x050505
    },
    vars: {
        maxBcFloor: 1550
    }
}