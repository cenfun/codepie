import axios from 'axios';

const Util = {
    font: 'Verdana,Helvetica,sans-serif',

    // estimate font width
    getFontWidth: (length, scale = 1, padding = 0) => {
        if (!length) {
            return 0;
        }
        const mlw = 6.625;
        return Math.ceil(((length + padding) * mlw) * scale);
    },

    hasOwn: function(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    },

    isNum: function(num) {
        if (typeof num !== 'number' || isNaN(num)) {
            return false;
        }
        const isInvalid = function(n) {
            if (n === Number.MAX_VALUE || n === Number.MIN_VALUE || n === Number.NEGATIVE_INFINITY || n === Number.POSITIVE_INFINITY) {
                return true;
            }
            return false;
        };
        if (isInvalid(num)) {
            return false;
        }
        return true;
    },

    toNum: function(num, toInt) {
        if (typeof num !== 'number') {
            num = parseFloat(num);
        }
        if (isNaN(num)) {
            num = 0;
        }
        if (toInt && !Number.isInteger(num)) {
            num = Math.round(num);
        }
        return num;
    },

    clamp: function(num, min, max) {
        return Math.max(Math.min(num, max), min);
    },

    dFixed: (num, fixed = 1) => {
        if (Number.isInteger(num)) {
            return num;
        }
        return Util.toNum(num.toFixed(fixed));
    },

    pixFixed: (num) => {
        const floor = Math.floor(num);
        if (num < floor + 0.5) {
            return floor + 0.5;
        }
        return floor + 1.5;
    },

    // bytes
    KBF: function(v) {
        const base = 1024;
        const units = ['', 'K', 'M', 'G', 'T', 'P'];
        const space = ' ';
        const postfix = 'B';
        return Util.KF(v, base, units, space, postfix);
    },

    // views
    KNF: function(v) {
        const base = 1000;
        const units = ['', 'K', 'M', 'B', 'T', 'P'];
        const space = '';
        const postfix = '';
        return Util.KF(v, base, units, space, postfix);
    },

    KF: function(v, base, units, space, postfix) {
        v = Util.toNum(v, true);
        if (v <= 0) {
            return `0${space}${postfix}`;
        }
        for (let i = 0, l = units.length; i < l; i++) {
            const min = Math.pow(base, i);
            const max = Math.pow(base, i + 1);
            if (v > min && v <= max) {
                const unit = units[i];
                if (unit) {
                    const n = v / min;
                    const nl = n.toString().split('.')[0].length;
                    const fl = Math.max(3 - nl, 1);
                    v = n.toFixed(fl);
                }
                v = v + space + unit + postfix;
                break;
            }
        }
        return v;
    },

    NF: function(v) {
        if (typeof v === 'number' && v) {
            return v.toLocaleString();
        }
        return v;
    },

    ago: (date, now) => {
        now = now || Date.now();
        date = new Date(date);
        const seconds = Math.max(0, Math.round((now - date) / 1000));

        const times = [
            seconds / 60 / 60 / 24 / 365,
            seconds / 60 / 60 / 24 / 30,
            seconds / 60 / 60 / 24 / 7,
            seconds / 60 / 60 / 24,
            seconds / 60 / 60,
            seconds / 60,
            seconds
        ];
        const names = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'];

        for (let i = 0; i < names.length; i++) {
            const time = Math.floor(times[i]);
            let name = names[i];
            if (time > 1) {
                name += 's';
            }

            if (time >= 1) {
                return `${time} ${name} ago`;
            }
        }

        return 'just now';
    },

    replace: function(str, obj, defaultValue) {
        str = `${str}`;
        if (!obj) {
            return str;
        }
        str = str.replace(/\{([^}{]+)\}/g, function(match, key) {
            if (!Util.hasOwn(obj, key)) {
                if (typeof defaultValue !== 'undefined') {
                    return defaultValue;
                }
                return match;
            }
            let val = obj[key];
            if (typeof val === 'function') {
                val = val(obj, key);
            }
            if (typeof val === 'undefined') {
                val = '';
            }
            return val;
        });
        return str;
    },

    // object
    getValue: function(data, dotPathStr, defaultValue) {
        if (!dotPathStr) {
            return defaultValue;
        }
        let current = data;
        const list = dotPathStr.split('.');
        const lastKey = list.pop();
        while (current && list.length) {
            const item = list.shift();
            current = current[item];
        }
        if (current && Util.hasOwn(current, lastKey)) {
            const value = current[lastKey];
            if (typeof value !== 'undefined') {
                return value;
            }
        }
        return defaultValue;
    },

    request: async (options) => {
        let err;
        const res = await axios(options).catch((e) => {
            err = e;
        });
        return [err, res];
    },

    normalizeColor: (str) => {
        if (str) {
            if (str.startsWith('#')) {
                return str;
            }

            if (str.startsWith('0x')) {
                return `#${str.slice(2)}`;
            }

            if ((/^([0-9a-f]{1,2}){3,4}$/i).test(str)) {
                return `#${str}`;
            }

            return str;
        }

        return str;
    },

    xmlEscape: (str) => {
        const map = {
            '>': '&gt;',
            '<': '&lt;',
            "'": '&apos;',
            '"': '&quot;',
            '&': '&amp;'
        };

        if (str) {
            Object.keys(map).forEach((k) => {
                str = str.replace(new RegExp(k, 'g'), map[k]);
            });
        }

        return str;
    },

    getLanguages: (nodes) => {
        const map = new Map();
        nodes.forEach((repo) => {
            const edges = Util.getValue(repo, 'languages.edges');
            if (edges) {
                edges.forEach((item) => {
                    const name = item.node.name;
                    const size = item.size;
                    const lang = map.get(name);
                    if (lang) {
                        map.set(name, lang + size);
                    } else {
                        map.set(name, size);
                    }
                });
            }
        });

        let total = 0;
        const languages = [];
        map.forEach((v, k) => {
            languages.push({
                size: v,
                name: k
            });
            total += v;
        });

        // clear for GC
        map.clear();

        languages.sort((a, b) => {
            return b.size - a.size;
        });

        languages.forEach((item) => {
            item.percent = item.size / total;
        });

        return languages;
    },

    getInvalidSvg: (w = 100, h = 30) => {
        return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" stroke="#ddd" rx="8" fill="none" />
            <text font-family="${Util.font}" x="${w / 2}" y="${h / 2}" alignment-baseline="central" text-anchor="middle">invalid</text>
            </svg>`;
    },

    responseJson: (data, options) => {
        const json = data || {};
        json.options = options;
        const content = JSON.stringify(json);
        return new Response(content, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    },

    responseSvg: (svg) => {
        return new Response(svg, {
            headers: {
                'Content-Type': 'image/svg+xml'
            }
        });
    }
};


export default Util;
