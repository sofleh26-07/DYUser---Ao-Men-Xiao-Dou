let searchU = `douyin.com,search`.split(`,`)
t = await chrome.tabs.query({})
t = t.find(a => searchU.every(b => a.url.includes(b)))
let keywords = [
    "人干什么都是为了更好",
    "人干什么都是为了更好输入产出",
    "人干什么都是输入产出",
    "人干的事都是改变产入产出都是为了更好",
    "人干的事都是改变产入产出都是为了更好哲学",
    "人干的事都是改变产入产出都是为了更好哲学女生博主",
    "人干的事都是改变产入产出都是为了更好哲学美女博主",
    "人干的事都是改变产入产出都是为了更好哲学男生博主",
    "人干的事都是改变产入产出都是为了更好哲学帅哥博主"
]

let R = []
let r

for (let keyword of keywords.slice(0, 1)) {
    await new Promise(r => setTimeout(r, 10000))
    r = await chrome.scripting.executeScript({
        target: { tabId: t.id },
        func: async function (keyword) {
            // Global storage for logs and rules
            let networkInterceptorLogs = [];

            // Helper function to check if a URL matches your rule
            let matchesRule = (url) => {
                let lowerUrl = String(url).toLowerCase();
                return lowerUrl.includes('aweme') && lowerUrl.includes('search');
            };

            // Helper: Auto convert binary -> text -> json with fallback
            async function processContent(rawData, contentType = '') {
                let rawText = '';
                let jsonParsed = null;
                let formatType = 'unknown';

                try {
                    // 1. Handle Binary / ArrayBuffer / Blob / Uint8Array -> Text
                    if (rawData instanceof ArrayBuffer) {
                        rawText = new TextDecoder('utf-8').decode(rawData);
                        formatType = 'binary-arraybuffer';
                    } else if (rawData instanceof Blob) {
                        rawText = await rawData.text();
                        formatType = 'binary-blob';
                    } else if (ArrayBuffer.isView(rawData)) {
                        rawText = new TextDecoder('utf-8').decode(rawData.buffer);
                        formatType = 'binary-typedarray';
                    } else if (typeof rawData === 'string') {
                        rawText = rawData;
                        formatType = 'text';
                    } else if (rawData && typeof rawData === 'object') {
                        // Already an object/JSON
                        jsonParsed = rawData;
                        rawText = JSON.stringify(rawData);
                        formatType = 'json-object';
                    } else {
                        rawText = String(rawData || '');
                        formatType = 'primitive';
                    }

                    // 2. Try converting text -> JSON (Priority)
                    if (!jsonParsed && typeof rawText === 'string' && rawText.trim().length > 0) {
                        let trimmed = rawText.trim();
                        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                            try {
                                jsonParsed = JSON.parse(trimmed);
                                formatType = formatType.includes('binary') ? 'binary->text->json' : 'text->json';
                            } catch (e) {
                                // Not valid JSON, keep as text
                            }
                        }
                    }
                } catch (err) {
                    rawText = '[Error processing content: ' + err.message + ']';
                    formatType = 'error';
                }

                return {
                    format: formatType,
                    contentType: contentType,
                    raw: rawText,
                    converted: jsonParsed !== null ? jsonParsed : rawText
                };
            }

            // 1. Override Fetch API
            let originalFetch = window.fetch;
            window.fetch = async function (...args) {
                let [resource, init] = args;
                let url = typeof resource === 'string' ? resource : resource instanceof Request ? resource.url : String(resource);
                let method = init && init.method ? init.method : (resource instanceof Request ? resource.method : 'GET');
                let headers = init && init.headers ? init.headers : (resource instanceof Request ? Object.fromEntries(resource.headers.entries()) : {});

                let startTime = Date.now();
                let response;

                try {
                    response = await originalFetch.apply(this, args);
                } catch (error) {
                    throw error;
                }

                if (matchesRule(url)) {
                    let clonedResponse = response.clone();
                    let contentType = clonedResponse.headers.get('content-type') || '';

                    // Extract body based on type (ArrayBuffer for binary, Text otherwise)
                    let rawBodyData;
                    try {
                        if (contentType.includes('application/json') || contentType.includes('text/') || contentType.includes('javascript')) {
                            rawBodyData = await clonedResponse.text();
                        } else {
                            rawBodyData = await clonedResponse.arrayBuffer();
                        }
                    } catch (e) {
                        rawBodyData = '[Could not read response body]';
                    }

                    let processedContent = await processContent(rawBodyData, contentType);

                    let reqDetailsInfoRichObj = {
                        url: url,
                        method: method,
                        headers: headers,
                        body: init && init.body ? init.body : null,
                        timestamp: startTime
                    };

                    let resDetailsInfoRichObj = {
                        status: response.status,
                        statusText: response.statusText,
                        headers: Object.fromEntries(response.headers.entries()),
                        ok: response.ok,
                        duration: Date.now() - startTime
                    };

                    let logEntry = {
                        type: 'fetch',
                        req: reqDetailsInfoRichObj,
                        res: resDetailsInfoRichObj,
                        con: processedContent
                    };

                    networkInterceptorLogs.push(logEntry);
                    console.info('[Interceptor Log Saved]', logEntry);
                }

                return response;
            };

            // 2. Override XMLHttpRequest (XHR)
            let originalXOpen = XMLHttpRequest.prototype.open;
            let originalXSend = XMLHttpRequest.prototype.send;
            let originalXSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

            XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
                this._interceptorData = {
                    method: method,
                    url: url,
                    headers: {},
                    startTime: 0
                };
                return originalXOpen.apply(this, arguments);
            };

            XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
                if (this._interceptorData && this._interceptorData.headers) {
                    this._interceptorData.headers[header] = value;
                }
                return originalXSetRequestHeader.apply(this, arguments);
            };

            XMLHttpRequest.prototype.send = function (body) {
                let xhrInstance = this;
                let data = xhrInstance._interceptorData;

                if (data && matchesRule(data.url)) {
                    data.startTime = Date.now();
                    data.body = body;

                    xhrInstance.addEventListener('load', async function () {
                        let contentType = xhrInstance.getResponseHeader('content-type') || '';
                        let rawBodyData = xhrInstance.response; // Can be text, ArrayBuffer, etc. depending on responseType

                        let processedContent = await processContent(rawBodyData, contentType);

                        let reqDetailsInfoRichObj = {
                            url: data.url,
                            method: data.method,
                            headers: data.headers,
                            body: data.body,
                            timestamp: data.startTime
                        };

                        let resDetailsInfoRichObj = {
                            status: xhrInstance.status,
                            statusText: xhrInstance.statusText,
                            headers: xhrInstance.getAllResponseHeaders(),
                            ok: xhrInstance.status >= 200 && xhrInstance.status < 300,
                            duration: Date.now() - data.startTime
                        };

                        let logEntry = {
                            type: 'xhr',
                            req: reqDetailsInfoRichObj,
                            res: resDetailsInfoRichObj,
                            con: processedContent
                        };

                        networkInterceptorLogs.push(logEntry);
                        console.info('[Interceptor XHR Log Saved]', logEntry);
                    });
                }

                return originalXSend.apply(this, arguments);
            };

            console.log('Advanced Auto-Converting Network Interceptor active ("aweme" & "search")...');








            let searchObjs = [], searchVAICs = []

            offset = 0

            do {
                let j = await fetch("https://www.douyin.com/aweme/v1/web/general/search/single/?device_platform=webapp&aid=6383&channel=channel_pc_web&search_channel=aweme_general&enable_history=0&keyword=" + encodeURIComponent(keyword) + "&search_source=normal_search&query_correct_type=1&is_filter_search=0&from_group_id=&disable_rs=1&offset=" + offset + "&count=20&need_filter_settings=0&list_type=single&search_id=20261110145019BD2638A4372AD4954336&update_version_code=170400&pc_client_type=1&pc_libra_divert=Mac&support_h265=1&support_dash=1&cpu_core_num=3&version_code=190600&version_name=19.6.0&cookie_enabled=true&screen_width=2560&screen_height=1440&browser_language=en-GB&browser_platform=MacIntel&browser_name=Brave&browser_version=150.0.0.0&browser_online=true&engine_name=Blink&engine_version=150.0.0.0&os_name=Mac+OS&os_version=10.15.7&device_memory=8&platform=PC&", {
                    "headers": {
                        "accept": "application/json, text/plain, */*",
                        "accept-language": "en-GB,en;q=0.9",
                        "cache-control": "no-cache",
                        "pragma": "no-cache",
                        "priority": "u=1, i",
                        "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Brave\";v=\"150\"",
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": "\"macOS\"",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin",
                        "sec-gpc": "1",
                    },
                    "body": null,
                    "method": "GET",
                    "mode": "cors",
                    "credentials": "include"
                }).then(a => a.json())
                searchObjs.push(j)
                console.log(searchObjs)
                if (j.data.length) offset += j.data.length
                else offset = 0
            } while (offset)


            searchVAICs = searchObjs.map(a => a.data.map(a => a.aweme_info)).flat(10)
            let s = JSON.stringify(searchVAICs, null, 1)
            searchVAICs
            let sn = JSON.stringify(networkInterceptorLogs, null, 1)


            return { s, sn }
            // download(s, `DYSearch VAICs - Q="${decodeURIComponent(keyword)}".json`);
            // download(sn, `DYSearch AllNPageConsole - Q="${decodeURIComponent(keyword)}".json`);
            // download(JSON.stringify(allN.filter(a => `aweme,search`.split(',').every(b => a.request.url.includes(b))), null, 1), `DYSearch AllNDevTools - Q="${decodeURIComponent(keyword)}".json`);

            // General download function
            function download(str, filename) {
                let blob = new Blob([str], { type: 'application/json;charset=utf-8;' });
                let link = document.createElement('a');
                let url = URL.createObjectURL(blob);

                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Release the object URL
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 1000);
            };
        },
        args: [keyword]
    })
    console.log(r)
    R.push(r)
}

function download(str, filename) {
    let blob = new Blob([str], { type: 'application/json;charset=utf-8;' });
    let link = document.createElement('a');
    let url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Release the object URL
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
};