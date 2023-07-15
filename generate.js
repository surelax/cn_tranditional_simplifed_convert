const fs = require('fs');


const TRIM_SAME_CHAR_MAPPING = true;

const JS_TEMPLATE =
  `
  // Usage example:
  /*
  const convertor = cnConvertor();
  convertor.s2t('some text');
  */
  function cnConvertor() {
    const t = '{{tranditional_chars}}';
    const s = '{{simplified_chars}}';
  
    const mappingCache = {};
  
    function buildCache() {
      const t2sMap = {};
      const s2tMap = {};
      for (let i = 0; i < t.length; i++) {
        const tc = t.charAt(i);
        const sc = s.charAt(i);
        if (!t2sMap[tc]) {
          t2sMap[tc] = sc;
        }
        if (!s2tMap[sc]) {
          s2tMap[sc] = tc;
        }
      }
  
      mappingCache['t2s'] = t2sMap;
      mappingCache['s2t'] = s2tMap;
      return mappingCache;
    }
  
    function getCache() {
      if (Object.keys(mappingCache).length === 0) {
        return buildCache();
      }
      return mappingCache;
    }
  
    function t2s(txt) {
      if (!txt) {
        return txt;
      }
  
      if (txt.length === 0) {
        return txt;
      }
  
      const cache = getCache();
      const t2sCache = cache['t2s'];
      let result = '';
      for (let i = 0; i < txt.length; i++) {
        const c = txt.charAt(i);
        result += t2sCache[c] ? t2sCache[c] : c;
      }
      return result;
    }
  
    function s2t(txt) {
      if (!txt) {
        return txt;
      }
  
      if (txt.length === 0) {
        return txt;
      }
  
      const cache = getCache();
      const s2tCache = cache['s2t'];
      let result = '';
      for (let i = 0; i < txt.length; i++) {
        const c = txt.charAt(i);
        result += s2tCache[c] ? s2tCache[c] : c;
      }
      return result;
    }
  
    return {
      s2t,
      t2s,
    }
  }  
`;

function extractOneline(line, t2s, s2t) {
  const lineNoSpace = line.replace(/\s/g, '');
  if (lineNoSpace.length < 4) {
    return;
  }

  let curChar = '';

  let curTwChar = '';
  let curZhChar = '';
  let extraChar = '';
  for (let i = 0; i < lineNoSpace.length; i++) {
    const c = lineNoSpace.charAt(i);
    if (c == '(' && lineNoSpace.charAt(i + 2) == ')') {
      if (!curChar) {
        console.error(`error parsing line [${line}]`);
        return;
      }
      if (curChar) {
        curTwChar = curChar;
      }
      // advance one to get zh char
      i += 1;
      curZhChar = lineNoSpace.charAt(i);

      // advance one to skip )
      i += 1;

      // advance one to get next
      i += 1;

      nextChar = lineNoSpace.charAt(i)
      if (nextChar == '*') {
        // skip *
        i += 1;
        nextChar = lineNoSpace.charAt(i);
      }

      if (nextChar == '[' && lineNoSpace.charAt(i + 2) == ']') {
        // if there is extra map
        extraChar = lineNoSpace.charAt(i + 1);
        // advan to skip extra map
        i += 2;
      }

      if (curTwChar && curZhChar) {
        t2s[curTwChar] = curZhChar;
        s2t[curZhChar] = curTwChar;
      }

      if (extraChar && !t2s[extraChar]) {
        t2s[extraChar] = curZhChar;
      }

      curChar = '';
      curTwChar = '';
      curZhChar = '';
      extraChar = '';
    } else {
      curChar = c;
    }
  }
}

function processAll(content) {
  const lines = content.split('\n');
  const t2s = {};
  const s2t = {};
  for (const line of lines) {
    extractOneline(line, t2s, s2t);
  }

  if (TRIM_SAME_CHAR_MAPPING) {
    for (const key in t2s) {
      if (t2s[key] == key) {
        delete t2s[key]; // remove unnecessary mapping
      }
    }
  }

  fs.writeFileSync('./bin/t2s.json', JSON.stringify(t2s));

  if (TRIM_SAME_CHAR_MAPPING) {
    for (const key in s2t) {
      if (s2t[key] == key) {
        delete s2t[key]; // remove unnecessary mapping
      }
    }
  }
  fs.writeFileSync('./bin/s2t.json', JSON.stringify(s2t));

  const tChars = [];
  const sChars = [];
  for (const key in t2s) {
    tChars.push(key);
    sChars.push(t2s[key]);
  }

  let js = JS_TEMPLATE.replace('{{tranditional_chars}}', tChars.join('')).replace('{{simplified_chars}}', sChars.join(''));
  fs.writeFileSync('./bin/t2s.js', js);
}

const content = fs.readFileSync('raw.txt', 'utf-8')
processAll(content);
