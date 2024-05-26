import EC from 'eight-colors';
import Util from '../../../utils/util';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const avatarCache = new Map();
let time_clean = Date.now();

// cache time: 2 hours
const cacheTime = 2 * 60 * 60 * 1000;
// clean time: 60 seconds
const cleanTime = 60 * 1000;

const avatarSize = 48;

const getAvatarImage = async (targetName, avatarUrl) => {

    const time = Date.now();
    if (time - time_clean > cleanTime) {
        time_clean = time;
        avatarCache.forEach((item, key) => {
            // console.log(item);
            if (time - item.time > cacheTime) {
                avatarCache.delete(key);
            }
        });
    }

    if (avatarCache.has(targetName)) {
        return avatarCache.get(targetName).data;
    }

    console.log(`load avatar: ${avatarUrl} ...`);
    const [err, res] = await Util.request({
        url: avatarUrl,
        method: 'get',
        responseType: 'arraybuffer'
    });

    if (err) {
        console.log(`failed to load avatar: ${avatarUrl}`);
        return '';
    }

    const contentType = res.headers['content-type'] || 'image';
    const base64 = Buffer.from(res.data, 'binary').toString('base64');
    console.log(`loaded avatar: ${avatarUrl} (${Date.now() - time} ms)`);

    const data = `data:${contentType};base64,${base64}`;
    avatarCache.set(targetName, {
        time,
        data
    });

    return data;
};

const getProfile = async (targetName) => {

    const variables = {
        login: targetName
    };

    const headers = {
        Authorization: `token ${GITHUB_TOKEN}`
    };

    // fetch only owner repos & not forks
    const data = {
        query: `
          query userInfo($login: String!) {
            user(login: $login) {
              name
              avatarUrl(size: 48)
              bio
              createdAt
              issues {
                totalCount
              }
              pullRequests {
                totalCount
              }
              contributionsCollection {
                contributionCalendar {
                  totalContributions
                }
              }
              repositories(ownerAffiliations: OWNER, isFork: false, first: 100, orderBy: {direction: DESC, field: STARGAZERS}) {
                totalCount
                totalDiskUsage
                nodes {
                  stargazers {
                    totalCount
                  }
                }
              }
            }
          }
        `,
        variables
    };

    const url = 'https://api.github.com/graphql';

    const [err, res] = await Util.request({
        url,
        method: 'post',
        headers,
        data
    });

    if (err) {
        EC.logRed(`failed to load profile: ${targetName}`);
        EC.logRed(err.message);
        // console.log(err.stack);
        const ed = Util.getValue(err, 'response.data');
        if (ed) {
            console.log(ed);
        }
        return;
    }

    const profileData = Util.getValue(res, 'data.data.user');
    if (profileData) {
        profileData.avatarImage = await getAvatarImage(targetName, profileData.avatarUrl);
    }
    return profileData;
};

const updateLayout = (items, padding, sw, sh) => {

    const space = 10;
    const rowHeight = 16;
    const iconSize = 16;

    items.forEach((item) => {
        const len = (`${item.label} ${item.value}`).length;
        item.minWidth = Util.getFontWidth(len, 1.1) + space + iconSize + 5;
    });

    const maxWidth = Math.max.apply(null, items.map((it) => it.minWidth));
    const maxCols = Math.max(Math.floor((sw - padding * 2) / (maxWidth + space)), 1);
    // console.log(sw, maxWidth, maxCols);

    const totalSpace = sw - padding * 2 - maxCols * maxWidth;
    const realSpace = maxCols > 1 ? Math.floor(totalSpace / (maxCols - 1)) : 0;

    let rowIndex;
    let colIndex;
    items.forEach((item, i) => {
        rowIndex = Math.floor(i / maxCols);
        colIndex = i % maxCols;

        // console.log(rowIndex, colIndex);
        item.left = iconSize + 5;
        item.right = maxWidth;

        item.x = padding + colIndex * (maxWidth + realSpace);
        item.y = sh + space + rowIndex * (rowHeight + space);

    });

    sh += (rowIndex + 1) * (rowHeight + space);

    return sh;
};

const getSvg = (targetName, data, options) => {
    if (!data) {
        return Util.getInvalidSvg();
    }

    const bg = Util.normalizeColor(options.bg);

    // svg width
    const sw = Math.abs(Util.toNum(options.width, true));
    const padding = 15;
    let sh = padding;

    const label = Util.replace(options.label, {
        bio: data.bio || targetName,
        name: data.name || targetName
    });

    const joined = `Joined GitHub ${Util.ago(data.createdAt)}`;
    const titleLeft = padding * 2 + avatarSize;
    const titleY = padding + avatarSize / 2;

    sh += avatarSize;

    let totalStars = 0;
    data.repositories.nodes.forEach((node) => {
        totalStars += node.stargazers.totalCount;
    });

    const items = [{
        label: 'Total Repositories',
        value: Util.NF(data.repositories.totalCount),
        icon: ['M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z']
    }, {
        label: 'Total Issues',
        value: Util.NF(data.issues.totalCount),
        icon: [
            'M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
            'M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z'
        ]
    }, {
        label: 'Total Pull Requests',
        value: Util.NF(data.pullRequests.totalCount),
        icon: ['M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z']
    }, {
        label: 'Total Stars',
        value: Util.KNF(totalStars),
        icon: ['M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z']
    }, {
        label: 'Disk Usage',
        // 1kB = 1000B 1kiB = 1024B
        value: Util.KBF(data.repositories.totalDiskUsage * 1024),
        icon: [
            'M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m.5-5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 1 0',
            'M12.096 6.223A5 5 0 0 0 13 5.698V7c0 .289-.213.654-.753 1.007a4.5 4.5 0 0 1 1.753.25V4c0-1.007-.875-1.755-1.904-2.223C11.022 1.289 9.573 1 8 1s-3.022.289-4.096.777C2.875 2.245 2 2.993 2 4v9c0 1.007.875 1.755 1.904 2.223C4.978 15.71 6.427 16 8 16c.536 0 1.058-.034 1.555-.097a4.5 4.5 0 0 1-.813-.927Q8.378 15 8 15c-1.464 0-2.766-.27-3.682-.687C3.356 13.875 3 13.373 3 13v-1.302c.271.202.58.378.904.525C4.978 12.71 6.427 13 8 13h.027a4.6 4.6 0 0 1 0-1H8c-1.464 0-2.766-.27-3.682-.687C3.356 10.875 3 10.373 3 10V8.698c.271.202.58.378.904.525C4.978 9.71 6.427 10 8 10q.393 0 .774-.024a4.5 4.5 0 0 1 1.102-1.132C9.298 8.944 8.666 9 8 9c-1.464 0-2.766-.27-3.682-.687C3.356 7.875 3 7.373 3 7V5.698c.271.202.58.378.904.525C4.978 6.711 6.427 7 8 7s3.022-.289 4.096-.777M3 4c0-.374.356-.875 1.318-1.313C5.234 2.271 6.536 2 8 2s2.766.27 3.682.687C12.644 3.125 13 3.627 13 4c0 .374-.356.875-1.318 1.313C10.766 5.729 9.464 6 8 6s-2.766-.27-3.682-.687C3.356 4.875 3 4.373 3 4'
        ]
    }, {
        label: 'Contributions Past Year',
        value: Util.NF(data.contributionsCollection.contributionCalendar.totalContributions),
        icon: ['M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z']
    }];

    sh = updateLayout(items, padding, sw, sh);

    sh += padding;

    // console.log(items);

    const list = [];
    list.push(`<svg width="${sw}" height="${sh}" viewBox="0 0 ${sw} ${sh}" xmlns="http://www.w3.org/2000/svg">`);
    list.push(`<title>${label}</title>`);

    list.push('<defs>');
    // clip path avatar
    list.push(`<clipPath id="cpa"><rect x="${padding}" y="${padding}" width="${avatarSize}" height="${avatarSize}" rx="${avatarSize}" fill="#fff"/></clipPath>`);

    list.push('</defs>');

    // border and bg
    list.push(`<rect x="0.5" y="0.5" width="${sw - 1}" height="${sh - 1}" stroke="#ddd" rx="8" fill="${bg}" />`);

    // avatar
    list.push('<g clip-path="url(#cpa)">');
    list.push(`<image x="${padding}" y="${padding}" href="${data.avatarImage}" width="${avatarSize}" height="${avatarSize}" />`);
    list.push('</g>');

    // title
    list.push('<g text-anchor="start">');
    list.push(`<text x="${titleLeft}" y="${titleY - 4}" font-size="16" dominant-baseline="auto">${label}</text>`);
    list.push(`<text x="${titleLeft}" y="${titleY + 4}" font-size="14" dominant-baseline="hanging">${joined}</text>`);
    list.push('</g>');

    items.forEach((item) => {
        list.push(`<g transform="translate(${item.x},${item.y})" font-size="14" dominant-baseline="hanging">`);

        list.push('<svg viewBox="0 0 16 16" width="16" height="16">');
        item.icon.forEach((d) => {
            list.push(`<path d="${d}"></path>`);
        });
        list.push('</svg>');

        list.push(`<text x="${item.left}" y="2" text-anchor="start">${item.label}</text>`);
        list.push(`<text x="${item.right}" y="2" text-anchor="end">${item.value}</text>`);
        list.push('</g>');
    });


    list.push('</svg>');

    return list.join('');

};

const getOptions = (searchParams) => {

    const options = {
        width: 600,
        bg: 'ffffff',
        label: '{name} - {bio}',
        output: 'svg'
    };

    Object.keys(options).forEach((k) => {
        if (searchParams.has(k)) {
            options[k] = searchParams.get(k);
        }
    });

    return options;

};

export async function GET(request) {
    const { pathname, searchParams } = new URL(request.url);

    const list = pathname.split('/').slice(3);

    const targetName = list.shift();

    const data = await getProfile(targetName);
    // console.log(data);

    const options = getOptions(searchParams);

    if (options.output === 'json') {
        return Util.responseJson(data, options);
    }

    const svg = getSvg(targetName, data, options);
    return Util.responseSvg(svg);
}