import ThreeBackground from './components/ThreeBackground.jsx'
import ScrollOrb from './components/ScrollOrb.jsx'
import BrandBar from './components/BrandBar.jsx'
import Hero from './components/Hero.jsx'
import Downloads from './components/Downloads.jsx'
import LiveDemo from './live/LiveDemo.jsx'
import SetupSteps from './components/SetupSteps.jsx'
import HelpBox from './components/HelpBox.jsx'
import Footer from './components/Footer.jsx'
import useRevealOnScroll from './hooks/useRevealOnScroll.js'

function App() {
  useRevealOnScroll()

  return (
    <>
      <ThreeBackground />
      <ScrollOrb />
      <BrandBar />
      <main>
        <Hero />
        <LiveDemo />
        <Downloads />
        <SetupSteps />
      </main>
      <HelpBox />
      <Footer />
    </>
  )
}

export default App
