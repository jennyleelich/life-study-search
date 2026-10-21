export function networkErrorMessage(error) {
  const code = error.cause?.code || error.cause?.errors?.[0]?.code || error.code;
  if (['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'CERT_HAS_EXPIRED'].includes(code)) {
    return `来源网站的 HTTPS 证书验证失败（${code}）。请检查系统时间和系统信任的证书；若使用公司网络，请确认其证书已正确安装。`;
  }
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(code)) return `无法解析来源网站的域名（${code}），请检查网络或 DNS。`;
  if (['ECONNREFUSED', 'ECONNRESET'].includes(code)) return `与来源网站的连接被拒绝或中断（${code}），请检查网络、代理或防火墙。`;
  if (['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT'].includes(code) || ['TimeoutError', 'AbortError'].includes(error.name)) {
    return '连接来源网站超时，请检查网络后重试。';
  }
  if (error.message === 'fetch failed') return '无法连接来源网站。请确认原文能否在本机浏览器中打开，并检查 Node.js 的代理及证书设置。';
  return error.message;
}
