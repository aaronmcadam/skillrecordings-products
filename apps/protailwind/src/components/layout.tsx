import React, {FunctionComponent} from 'react'
import {NextSeo} from '@skillrecordings/next-seo'
import {Toaster} from 'react-hot-toast'
import cx from 'classnames'
import Navigation from 'components/navigation'
import type {LayoutProps} from '@types'
import {useRouter} from 'next/router'
import {useFeedback} from '@skillrecordings/feedback-widget'

const Layout: FunctionComponent<React.PropsWithChildren<LayoutProps>> = ({
  children,
  className,
  meta,
  noIndex,
  noNav,
  navClassName,
}) => {
  const router = useRouter()
  const {
    title,
    description,
    titleAppendSiteName = false,
    url = `${process.env.NEXT_PUBLIC_URL}${router.asPath}`,
    type = 'website',
    ogImage,
    date,
  } = meta || {}
  const {isFeedbackDialogOpen, feedbackComponent} = useFeedback()

  return (
    <div className="relative">
      <Toaster position="top-center" />
      <NextSeo
        title={title}
        description={description}
        titleTemplate={titleAppendSiteName ? `%s | Pro Tailwind` : undefined}
        openGraph={{
          title,
          description,
          type,
          url,
          images: ogImage ? [ogImage] : undefined,
          article: {
            publishedTime: date,
          },
        }}
        canonical={url}
        noindex={noIndex}
      />
      {isFeedbackDialogOpen && feedbackComponent}
      {!noNav && <Navigation className={navClassName} />}
      <div
        className={cx(
          'flex min-h-[calc(100vh-100px)] flex-grow flex-col sm:min-h-[calc(100vh-76px)]',
          className,
        )}
      >
        {children}
        {/* {footer ? footer : isNull(footer) ? null : <Footer />} */}
      </div>
    </div>
  )
}

export default Layout
