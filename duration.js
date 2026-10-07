function parse(s){const m=String(s||'').match(/^(\d+)\s*(s|m|h|d)$/i);if(!m)return null;return Number(m[1])*({s:1,m:60,h:3600,d:86400}[m[2].toLowerCase()])}module.exports={parse};
