/**
 * @fileoverview Background decorative elements for visual enhancement.
 * 
 * This component renders subtle animated background effects to enhance the
 * visual appeal of the application. It includes gradient circles with
 * pulsing animations that create a dynamic background without interfering
 * with the main content.
 * 
 * @module BackgroundEffects
 */

/**
 * Background decorative elements component.
 * 
 * Renders animated gradient circles that create a subtle background effect
 * to enhance the visual appeal of the application.
 * 
 * @returns {JSX.Element} The background effects component
 * 
 * @example
 * <div className="relative">
 *   <BackgroundEffects />
 *   <main>Content goes here</main>
 * </div>
 */
const BackgroundEffects = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-amber-300/20 to-orange-300/20 rounded-full blur-3xl animate-pulse-slow" />
    <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-gradient-to-br from-orange-300/20 to-amber-300/20 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />
    <div className="absolute top-3/4 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-200/10 to-orange-200/10 rounded-full blur-3xl animate-pulse-slow animation-delay-4000" />
  </div>
);

export default BackgroundEffects;
