import '../components/landing/landing.css'
import Nav from '../components/landing/Nav.jsx'
import Hero from '../components/landing/Hero.jsx'
import Problem from '../components/landing/Problem.jsx'
import Pipeline from '../components/landing/Pipeline.jsx'
import Features from '../components/landing/Features.jsx'
import Benchmarks from '../components/landing/Benchmarks.jsx'
import EdgeCase from '../components/landing/EdgeCase.jsx'
import Impact from '../components/landing/Impact.jsx'
import Footer from '../components/landing/Footer.jsx'

export default function Landing() {
  return (
    <div className="landing min-h-svh bg-abyss font-sans text-base text-fg antialiased">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Pipeline />
        <Features />
        <Benchmarks />
        <EdgeCase />
        <Impact />
      </main>
      <Footer />
    </div>
  )
}
