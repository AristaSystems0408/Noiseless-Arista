import ThreeBackground from './components/ThreeBackground.jsx'
import BrandBar from './components/BrandBar.jsx'
import Hero from './components/Hero.jsx'
import Downloads from './components/Downloads.jsx'
import SetupSteps from './components/SetupSteps.jsx'
import HelpBox from './components/HelpBox.jsx'
import Footer from './components/Footer.jsx'
import useRevealOnScroll from './hooks/useRevealOnScroll.js'

function App() {
  useRevealOnScroll()

  return (
    <>
      <ThreeBackground />
      <BrandBar />
      <main>
        <Hero />
        <Downloads />
        <SetupSteps />
      </main>
      <HelpBox />
      <Footer />
    </>
  )
}

export default App
