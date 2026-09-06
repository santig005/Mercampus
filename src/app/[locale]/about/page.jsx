'use client';

import Link from 'next/link';
import { FaHamburger, FaBook, FaHome, FaTicketAlt, FaInstagram, FaArrowRight, FaUsers, FaShieldAlt, FaRocket, FaSearch, FaClock, FaMobile, FaStar, FaCheckCircle } from 'react-icons/fa';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const InfoPage = () => {
  const t = useTranslations('About');

  return (
    <div className="bg-white text-gray-800 min-h-screen !w-full">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-25 w-full pt-20">
        {/* Subtle background elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl"></div>

        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left Column - Text Content */}
            <motion.div
              className="flex-1 text-left space-y-8"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="space-y-4">
                <motion.div
                  className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <FaRocket className="mr-2" />
                  {t('hero.badge')}
                </motion.div>
                <motion.h1
                  className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  Mercampus
                </motion.h1>
                <motion.h2
                  className="text-2xl sm:text-3xl lg:text-4xl font-light text-gray-600 leading-relaxed"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                >
                  {t('hero.subtitle')}
                </motion.h2>
              </div>

              <motion.p
                className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                {t('hero.description')}
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0 }}
              >
                <Link href="/auth/register" className="group inline-flex items-center px-8 py-4 bg-orange-500 text-white rounded-2xl text-lg font-semibold hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                  {t('hero.ctaPrimary')}
                  <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
                <Link href="/antojos" className="inline-flex items-center px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-2xl text-lg font-semibold hover:border-orange-500 hover:text-orange-600 transition-all duration-300">
                  {t('hero.ctaSecondary')}
                </Link>
              </motion.div>

              <motion.div
                className="flex items-center gap-8 pt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
              >
                <div className="flex items-center gap-2">
                  <FaUsers className="text-orange-500 text-xl" />
                  <span className="text-gray-600">{t('hero.statStudents')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaShieldAlt className="text-orange-500 text-xl" />
                  <span className="text-gray-600">{t('hero.statSecure')}</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Image */}
            <motion.div
              className="hidden lg:flex flex-1 justify-center lg:justify-end"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.0, delay: 0.5 }}
            >
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-orange-300/10 rounded-3xl blur-xl"></div>
                <Image
                  src="/images/hero/hero-image.png"
                  alt={t('hero.imageAlt')}
                  width={500}
                  height={500}
                  quality={100}
                  className="relative max-w-full h-auto rounded-3xl shadow-2xl"
                  priority
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Problema que resolvemos */}
      <section className="py-20 lg:py-32 w-full">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {t('problem.heading')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('problem.subheading')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              className="group p-8 bg-white rounded-3xl border border-gray-100 hover:border-orange-200 transition-all duration-150 hover:shadow-xl hover:-translate-y-2"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.03,
                rotateY: 2,
                transition: { duration: 0.01 }
              }}
            >
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-200 transition-colors duration-300">
                <FaSearch className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('problem.search.title')}</h3>
              <p className="text-gray-600 leading-relaxed">{t('problem.search.quote')}</p>
            </motion.div>

            <motion.div
              className="group p-8 bg-white rounded-3xl border border-gray-100 hover:border-orange-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-2"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.03,
                rotateY: 2,
                transition: { duration: 0.01 }
              }}
            >
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-200 transition-colors duration-300">
                <FaClock className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('problem.time.title')}</h3>
              <p className="text-gray-600 leading-relaxed">{t('problem.time.quote')}</p>
            </motion.div>

            <motion.div
              className="group p-8 bg-white rounded-3xl border border-gray-100 hover:border-orange-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-2"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.03,
                rotateY: 2,
                transition: { duration: 0.01 }
              }}
            >
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-200 transition-colors duration-300">
                <FaShieldAlt className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('problem.trust.title')}</h3>
              <p className="text-gray-600 leading-relaxed">{t('problem.trust.quote')}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Qué es Mercampus */}
      <section className="py-20 lg:py-32 bg-gray-50 w-full relative overflow-hidden">
        {/* Background blur elements */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-orange-200/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-orange-300/15 rounded-full blur-3xl"></div>
        <div className="mx-auto max-w-6xl px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {t('what.heading')}
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              {t('what.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="flex items-start gap-4"
                whileHover={{ x: 10 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0"
                >
                  <FaMobile className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3
                    className="text-xl font-semibold text-gray-900 mb-2"
                  >
                    {t('what.mobile.title')}
                  </h3>
                  <p className="text-gray-600">{t('what.mobile.text')}</p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-start gap-4"
                whileHover={{ x: 10 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0"

                >
                  <FaUsers className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3
                    className="text-xl font-semibold text-gray-900 mb-2"

                  >
                    {t('what.community.title')}
                  </h3>
                  <p className="text-gray-600">{t('what.community.text')}</p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-start gap-4"
                whileHover={{ x: 10 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0"

                >
                  <FaStar className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3
                    className="text-xl font-semibold text-gray-900 mb-2"

                  >
                    {t('what.quality.title')}
                  </h3>
                  <p className="text-gray-600">{t('what.quality.text')}</p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-orange-300/10 rounded-3xl blur-xl"></div>
              <motion.div
                className="relative bg-white rounded-3xl p-8 shadow-2xl"
                whileHover={{
                  scale: 1.05,
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
              >
                <div className="space-y-4">
                  <div
                    className="flex items-center gap-3"

                  >
                    <div
                      className="w-3 h-3 bg-green-500 rounded-full"

                    ></div>
                    <span className="text-sm text-gray-600">{t('what.cardOnline')}</span>
                  </div>
                  <h4
                    className="text-lg font-semibold text-gray-900"

                  >
                    {t('what.cardApp')}
                  </h4>
                  <p className="text-gray-600 text-sm">{t('what.cardText')}</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categorías principales */}
      <section className="py-20 lg:py-32 w-full">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {t('categories.heading')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('categories.subheading')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <motion.div
              className="group p-8 bg-white rounded-3xl border border-gray-100 hover:border-orange-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                transition: { duration: 0.3 }
              }}
            >
              <div
                className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-200 transition-colors duration-300"

                transition={{ duration: 0.3}}
              >
                <FaHamburger className="w-8 h-8 text-orange-600" />
              </div>
              <motion.h3
                className="text-lg font-semibold text-gray-900 mb-2"
                whileHover={{ color: "#ea580c" }}
                transition={{ duration: 0.2 }}
              >
                {t('categories.food.title')}
              </motion.h3>
              <p className="text-sm text-gray-600">{t('categories.food.text')}</p>
            </motion.div>

            <motion.div
              className="group p-8 bg-white rounded-3xl border border-gray-100 hover:border-orange-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                transition: { duration: 0.3 }
              }}
            >
              <div
                className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-200 transition-colors duration-300"

                transition={{ duration: 0.3 }}
              >
                <FaBook className="w-8 h-8 text-orange-600" />
              </div>
              <motion.h3
                className="text-lg font-semibold text-gray-900 mb-2"
                whileHover={{ color: "#ea580c" }}
                transition={{ duration: 0.2 }}
              >
                {t('categories.services.title')}
              </motion.h3>
              <p className="text-sm text-gray-600">{t('categories.services.text')}</p>
            </motion.div>

            <motion.div
              className="group p-8 bg-white rounded-3xl border border-gray-100 hover:border-orange-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                transition: { duration: 0.3 }
              }}
            >
              <div
                className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-200 transition-colors duration-300"

                transition={{ duration: 0.3 }}
              >
                <FaHome className="w-8 h-8 text-orange-600" />
              </div>
              <motion.h3
                className="text-lg font-semibold text-gray-900 mb-2"
                whileHover={{ color: "#ea580c" }}
                transition={{ duration: 0.2 }}
              >
                {t('categories.campusLife.title')}
              </motion.h3>
              <p className="text-sm text-gray-600">{t('categories.campusLife.text')}</p>
            </motion.div>

            <motion.div
              className="group p-8 bg-white rounded-3xl border border-gray-100 hover:border-orange-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                transition: { duration: 0.3 }
              }}
            >
              <div
                className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-200 transition-colors duration-300"

                transition={{ duration: 0.3 }}
              >
                <FaTicketAlt className="w-8 h-8 text-orange-600" />
              </div>
              <motion.h3
                className="text-lg font-semibold text-gray-900 mb-2"
                whileHover={{ color: "#ea580c" }}
                transition={{ duration: 0.2 }}
              >
                {t('categories.events.title')}
              </motion.h3>
              <p className="text-sm text-gray-600">{t('categories.events.text')}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-20 lg:py-32 bg-gray-50 w-full relative overflow-hidden">
        {/* Background blur elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-300/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-orange-400/15 rounded-full blur-3xl"></div>
        <div className="mx-auto max-w-6xl px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {t('benefits.heading')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('benefits.subheading')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-16">
            <div
              className="space-y-8"
            >
              <h3
                className="text-3xl font-bold text-gray-900 mb-8"
              >
                {t('benefits.buyersHeading')}
              </h3>
              <div className="space-y-6">
                <div
                  className="flex items-start gap-4"
                >
                  <div
                    className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                  >
                    <FaCheckCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h4
                      className="text-lg font-semibold text-gray-900 mb-2"
                    >
                      {t('benefits.buyer1.title')}
                    </h4>
                    <p className="text-gray-600">{t('benefits.buyer1.text')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <FaCheckCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('benefits.buyer2.title')}</h4>
                    <p className="text-gray-600">{t('benefits.buyer2.text')}</p>
                  </div>
                </div>

                <div
                  className="flex items-start gap-4"
                >
                  <div
                    className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                  >
                    <FaCheckCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h4
                      className="text-lg font-semibold text-gray-900 mb-2"
                    >
                      {t('benefits.buyer3.title')}
                    </h4>
                    <p className="text-gray-600">{t('benefits.buyer3.text')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-8">{t('benefits.sellersHeading')}</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <FaCheckCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('benefits.seller1.title')}</h4>
                    <p className="text-gray-600">{t('benefits.seller1.text')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <FaCheckCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('benefits.seller2.title')}</h4>
                    <p className="text-gray-600">{t('benefits.seller2.text')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <FaCheckCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('benefits.seller3.title')}</h4>
                    <p className="text-gray-600">{t('benefits.seller3.text')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-20 lg:py-32 w-full">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {t('howItWorks.heading')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('howItWorks.subheading')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group text-center">
              <div className="w-24 h-24 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('howItWorks.step1.title')}</h3>
              <p className="text-gray-600 leading-relaxed">{t('howItWorks.step1.text')}</p>
            </div>

            <div className="group text-center">
              <div className="w-24 h-24 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('howItWorks.step2.title')}</h3>
              <p className="text-gray-600 leading-relaxed">{t('howItWorks.step2.text')}</p>
            </div>

            <div className="group text-center">
              <div className="w-24 h-24 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('howItWorks.step3.title')}</h3>
              <p className="text-gray-600 leading-relaxed">{t('howItWorks.step3.text')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comunidad y testimonios */}
      <section className="py-20 lg:py-32 bg-gray-50 w-full relative overflow-hidden">
        {/* Background blur elements */}
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-orange-200/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-orange-300/15 rounded-full blur-3xl"></div>
        <div className="mx-auto max-w-6xl px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {t('community.heading')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('community.subheading')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="group p-8 bg-white rounded-3xl border border-gray-100 hover:border-orange-200 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <FaUsers className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">María G.</h4>
                  <p className="text-sm text-gray-600">{t('community.testimonial1.role')}</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed italic">{t('community.testimonial1.quote')}</p>
            </div>

            <div className="group p-8 bg-white rounded-3xl border border-gray-100 hover:border-orange-200 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <FaHamburger className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Carlos R.</h4>
                  <p className="text-sm text-gray-600">{t('community.testimonial2.role')}</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed italic">{t('community.testimonial2.quote')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Crecimiento y vision */}
      <section className="py-20 lg:py-32 w-full">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8">
              {t('vision.heading')}
            </h2>
            <div className="max-w-4xl mx-auto">
              <p className="text-xl sm:text-2xl text-gray-600 leading-relaxed mb-8">
                {t('vision.quote')}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-orange-600 mb-2">10M+</div>
                  <div className="text-gray-600">{t('vision.statStudents')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-600 mb-2">50+</div>
                  <div className="text-gray-600">{t('vision.statUniversities')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-600 mb-2">100%</div>
                  <div className="text-gray-600">{t('vision.statSecure')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Final */}
      <section className="py-20 lg:py-32 bg-orange-500 w-full relative overflow-hidden">
        {/* Background blur elements */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-white/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="mx-auto max-w-6xl px-6 text-center relative">
          <div className="flex items-center justify-center gap-6 mb-8 flex-wrap">
            <motion.h2
              className="text-4xl sm:text-5xl font-bold text-white"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              {t('finalCta.heading')}
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.1,
                rotate: [0, -5, 5, 0],
                transition: { duration: 0.5 }
              }}
            >
              <Image
                src="/ardilla.png"
                alt={t('finalCta.mascotAlt')}
                width={200}
                height={200}
                className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48"
                quality={100}
                priority
              />
            </motion.div>
          </div>
          <p className="text-xl text-orange-100 mb-12 max-w-3xl mx-auto">
            {t('finalCta.description')}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link href="/auth/register" className="group inline-flex items-center px-8 py-4 bg-white text-orange-600 rounded-2xl text-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg">
              {t('finalCta.cta')}
              <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <a href="https://www.instagram.com/mercampus/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-8 py-4 border-2 border-white/30 text-white rounded-2xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
              <FaInstagram className="mr-2" /> {t('finalCta.instagram')}
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12 w-full">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-gray-400">{t('footer')}</p>
        </div>
      </footer>
    </div>
  );
};

export default InfoPage;
