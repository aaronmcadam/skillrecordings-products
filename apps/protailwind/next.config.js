/** @type {import('next').NextConfig} */
const {withSentryConfig} = require('@sentry/nextjs')
const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    providerImportSource: '@mdx-js/react',
  },
})

const IMAGE_HOST_DOMAINS = [
  `res.cloudinary.com`,
  `d2eip9sf3oo6c2.cloudfront.net`,
  `cdn.sanity.io`,
  `protailwind.com`,
  `image.mux.com`,
  'localhost',
  process.env.NEXT_PUBLIC_HOST,
]

const nextConfig = {
  transpilePackages: ['@skillrecordings/skill-lesson', '@skillrecordings/ui'],
  eslint: {ignoreDuringBuilds: true},
  experimental: {scrollRestoration: true, esmExternals: 'loose'},
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  images: {
    domains: IMAGE_HOST_DOMAINS,
  },
  async redirects() {
    return [
      {
        source: '/chat',
        destination: 'https://discord.gg/QcKyPVCwJC',
        permanent: true,
      },
    ]
  },
}

const sentryWebpackPluginOptions = process.env.SENTRY_AUTH_TOKEN && {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true, // Suppresses all logs
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
}

const configWithPlugins = withMDX(nextConfig)
// const configWithPlugins = withMDX(withImages(nextConfig))

if (sentryWebpackPluginOptions) {
  module.exports = withSentryConfig(
    configWithPlugins,
    sentryWebpackPluginOptions,
  )
} else {
  module.exports = configWithPlugins
}
