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



// Global storage for logs and rules
let networkInterceptorLogs = [];

// Helper function to check if a URL matches your rule
let matchesRule = (url) => {
    let lowerUrl = String(url).toLowerCase();
    return lowerUrl.includes('aweme') && lowerUrl.includes('search');
};

// 1. Override Fetch API
let originalFetch = window.fetch;
window.fetch = async function(...args) {
    let [resource, init] = args;
    let url = typeof resource === 'string' ? resource : resource instanceof Request ? resource.url : String(resource);
    
    let method = init && init.method ? init.method : (resource instanceof Request ? resource.method : 'GET');
    let headers = init && init.headers ? init.headers : (resource instanceof Request ? Object.fromEntries(resource.headers.entries()) : {});

    // Rule Check: Block request if needed (e.g., throwing an error stops execution)
    if (matchesRule(url)) {
        console.warn('[Interceptor] Blocked fetch request matching rule:', url);
        // Uncomment the line below if you want to completely block/prevent it from running:
        // throw new Error('Blocked by network interceptor rule');
    }

    // Modify request URL or headers if needed here
    // e.g., init = { ...init, headers: { ...headers, 'X-Custom-Header': 'value' } };

    let startTime = Date.now();
    let response;
    
    try {
        response = await originalFetch.apply(this, args);
    } catch (error) {
        throw error;
    }

    // If rule matches, process and save details rich object
    if (matchesRule(url)) {
        // Clone response so we can read body without disrupting the application
        let clonedResponse = response.clone();
        let responseText = '';
        try {
            responseText = await clonedResponse.text();
            // Try parsing as JSON if possible, otherwise keep text
            try { responseText = JSON.parse(responseText); } catch (e) {}
        } catch (e) {
            responseText = '[Could not read response body]';
        }

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
            con: responseText
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

XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    this._interceptorData = {
        method: method,
        url: url,
        headers: {},
        startTime: 0
    };
    return originalXOpen.apply(this, arguments);
};

XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    if (this._interceptorData && this._interceptorData.headers) {
        this._interceptorData.headers[header] = value;
    }
    return originalXSetRequestHeader.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(body) {
    let xhrInstance = this;
    let data = xhrInstance._interceptorData;

    if (data && matchesRule(data.url)) {
        data.startTime = Date.now();
        data.body = body;

        // Block rule example:
        // xhrInstance.abort();
        // return;

        xhrInstance.addEventListener('load', function() {
            let responseContent = xhrInstance.responseText;
            try { responseContent = JSON.parse(responseContent); } catch (e) {}

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
                con: responseContent
            };

            networkInterceptorLogs.push(logEntry);
            console.info('[Interceptor XHR Log Saved]', logEntry);
        });
    }

    return originalXSend.apply(this, arguments);
};

console.log('Network interceptor active. Listening for "aweme" & "search" in URLs...');







let searchObjs = [], searchVAICs = []

keyword = `%E4%BA%BA%E5%B9%B2%E4%BB%80%E4%B9%88%E9%83%BD%E6%98%AF%E4%B8%BA%E4%BA%86%E6%9B%B4%E5%A5%BD`, offset = 0

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
networkInterceptorLogs