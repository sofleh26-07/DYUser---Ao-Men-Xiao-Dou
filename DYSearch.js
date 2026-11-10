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
    if(searchObjs.data.length) offset += 20
    else offset = 0
} while (offset)

