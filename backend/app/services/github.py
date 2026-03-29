import hashlib
import hmac
import logging

import httpx

logger = logging.getLogger(__name__)


def get_github_headers(access_token: str) -> dict:
    return {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def get_user_repos(access_token: str) -> list[dict]:
    """Fetch all repos the user has access to."""
    repos = []
    page = 1
    while True:
        res = httpx.get(
            "https://api.github.com/user/repos",
            headers=get_github_headers(access_token),
            params={"per_page": 50, "page": page, "sort": "updated"},
        )
        if res.status_code != 200:
            break
        data = res.json()
        if not data:
            break
        repos.extend([
            {"full_name": r["full_name"], "private": r["private"], "default_branch": r["default_branch"]}
            for r in data
        ])
        page += 1
        if len(data) < 50:
            break
    return repos


def get_recent_commits(access_token: str, repo: str, branch: str = "main") -> list[dict]:
    """Fetch last 10 commits from a repo branch."""
    res = httpx.get(
        f"https://api.github.com/repos/{repo}/commits",
        headers=get_github_headers(access_token),
        params={"sha": branch, "per_page": 10},
    )
    if res.status_code != 200:
        return []
    return [
        {
            "sha": c["sha"][:7],
            "full_sha": c["sha"],
            "message": c["commit"]["message"].split("\n")[0],
            "author": c["commit"]["author"]["name"],
            "date": c["commit"]["author"]["date"],
            "url": c["html_url"],
        }
        for c in res.json()
    ]


def create_webhook(access_token: str, repo: str, webhook_url: str, secret: str) -> int | None:
    """Create a push webhook on the repo. Returns webhook ID or None."""
    res = httpx.post(
        f"https://api.github.com/repos/{repo}/hooks",
        headers=get_github_headers(access_token),
        json={
            "name": "web",
            "active": True,
            "events": ["push"],
            "config": {
                "url": webhook_url,
                "content_type": "json",
                "secret": secret,
            },
        },
    )
    if res.status_code == 201:
        return res.json()["id"]
    logger.error(f"Failed to create webhook: {res.status_code} {res.text}")
    return None


def delete_webhook(access_token: str, repo: str, webhook_id: int) -> None:
    httpx.delete(
        f"https://api.github.com/repos/{repo}/hooks/{webhook_id}",
        headers=get_github_headers(access_token),
    )


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify HMAC-SHA256 signature from GitHub."""
    expected = "sha256=" + hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def get_repo_readme(access_token: str, repo: str) -> str | None:
    """Fetch README content for AI task generation."""
    res = httpx.get(
        f"https://api.github.com/repos/{repo}/readme",
        headers=get_github_headers(access_token),
    )
    if res.status_code != 200:
        return None
    import base64
    content = res.json().get("content", "")
    try:
        return base64.b64decode(content).decode("utf-8")[:3000]
    except Exception:
        return None