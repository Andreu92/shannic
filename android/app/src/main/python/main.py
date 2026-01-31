from urllib.parse import urlparse, parse_qs
import json
import innertube
import yt_dlp

def search(query: str, next_token: str = None, max_results: int = 20):
    client = innertube.InnerTube("ANDROID")
    search_data = {}
    results = []

    while len(results) < max_results:
        response = client.search(query=query, continuation=next_token)

        contents = (
            response.get("contents" if not next_token else "continuationContents", {})
                    .get("sectionListRenderer" if not next_token else "sectionListContinuation", {})
                    .get("contents", [])
        )

        for section in contents:
            items = section.get("itemSectionRenderer", {}).get("contents", [])
            for item in items:
                video = None
                if "elementRenderer" in item:
                    video = item["elementRenderer"].get("videoRenderer")
                if "compactVideoRenderer" in item:
                    video = item["compactVideoRenderer"]

                if video is None or "lengthText" not in video: continue

                video_id = video.get("videoId")
                title = "".join([r.get("text", "") for r in video.get("title", {}).get("runs", [])])
                author = "".join([r.get("text", "") for r in video.get("longBylineText", {}).get("runs", [])])
                thumbnail = video.get("thumbnail", {}).get("thumbnails", [{}])[-1].get("url")
                duration = video.get("lengthText", {}).get("runs", [{}])[0].get("text", "-")

                results.append({
                    "id": video_id,
                    "title": title,
                    "author": author,
                    "thumbnail": thumbnail,
                    "duration": duration
                })

                if len(results) >= max_results:
                    break
            if len(results) >= max_results:
                break

        continuations = (
            response.get("contents" if not next_token else "continuationContents", {})
                    .get("sectionListRenderer" if not next_token else "sectionListContinuation", {})
                    .get("continuations", [])
        )

        if continuations:
            next_token = continuations[0].get("nextContinuationData", {}).get("continuation")
        else:
            break

    search_data["next_token"] = next_token
    search_data["results"] = results

    return json.dumps(search_data)

def get(video_id: str) -> dict:
    url = f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts = {
        'quiet': True,
        'format': 'ba',
        'no_warnings': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['android_vr'],
                'skip': ['hls', 'dash', 'translated_subs'],
                'fetch_pot': 'never'
            }
        }
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        url = info.get("url")
        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)

        return json.dumps({
            "id": video_id,
            "title": info.get("title"),
            "author": info.get("uploader"),
            "duration": info.get("duration") * 1000,
            "durationText": info.get("duration_string"),
            "thumbnail": {
                "url": info.get("thumbnail")
            },
            "url": url,
            "expirationDate": int(query_params['expire'][0]) * 1000
        })