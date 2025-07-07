"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Play, RotateCcw, Trophy, Heart } from "lucide-react"

interface GameObject {
  x: number
  y: number
  width: number
  height: number
  speed: number
}

interface Turtle extends GameObject {
  targetY: number
}

interface Debris extends GameObject {
  type: "bottle" | "bag" | "can"
  rotation: number
}

export default function TurtleOceanGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number | null>(null)
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const lastUpdateTime = useRef(Date.now())

  // Game objects
  const turtle = useRef<Turtle>({
    x: 100,
    y: 200,
    width: 60,
    height: 40,
    speed: 5,
    targetY: 200,
  })

  const debris = useRef<Debris[]>([])
  const keys = useRef<{ [key: string]: boolean }>({})

  // Initialize high score from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem("turtle-game-high-score")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore))
    }
  }, [])

  const drawTurtle = (ctx: CanvasRenderingContext2D, turtle: Turtle) => {
    ctx.save()
    ctx.translate(turtle.x + turtle.width / 2, turtle.y + turtle.height / 2)

    // Body
    ctx.fillStyle = "#2D5016"
    ctx.beginPath()
    ctx.ellipse(0, 0, turtle.width / 2, turtle.height / 2, 0, 0, Math.PI * 2)
    ctx.fill()

    // Shell pattern
    ctx.fillStyle = "#1A3009"
    ctx.beginPath()
    ctx.ellipse(0, -5, turtle.width / 3, turtle.height / 3, 0, 0, Math.PI * 2)
    ctx.fill()

    // Head
    ctx.fillStyle = "#4A7C59"
    ctx.beginPath()
    ctx.ellipse(turtle.width / 3, 0, 15, 12, 0, 0, Math.PI * 2)
    ctx.fill()

    // Eyes
    ctx.fillStyle = "#000"
    ctx.beginPath()
    ctx.arc(turtle.width / 3 + 8, -3, 2, 0, Math.PI * 2)
    ctx.arc(turtle.width / 3 + 8, 3, 2, 0, Math.PI * 2)
    ctx.fill()

    // Flippers
    ctx.fillStyle = "#2D5016"
    ctx.beginPath()
    ctx.ellipse(-turtle.width / 3, -turtle.height / 3, 8, 15, -0.3, 0, Math.PI * 2)
    ctx.ellipse(-turtle.width / 3, turtle.height / 3, 8, 15, 0.3, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  const drawDebris = (ctx: CanvasRenderingContext2D, item: Debris) => {
    ctx.save()
    ctx.translate(item.x + item.width / 2, item.y + item.height / 2)
    ctx.rotate(item.rotation)

    switch (item.type) {
      case "bottle":
        // Plastic bottle
        ctx.fillStyle = "#87CEEB"
        ctx.fillRect(-item.width / 2, -item.height / 2, item.width, item.height)
        ctx.fillStyle = "#4169E1"
        ctx.fillRect(-item.width / 2, -item.height / 2, item.width, item.height / 4)
        break
      case "bag":
        // Plastic bag
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
        ctx.beginPath()
        ctx.moveTo(-item.width / 2, -item.height / 2)
        ctx.lineTo(item.width / 2, -item.height / 2)
        ctx.lineTo(item.width / 3, item.height / 2)
        ctx.lineTo(-item.width / 3, item.height / 2)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = "#DDD"
        ctx.stroke()
        break
      case "can":
        // Aluminum can
        ctx.fillStyle = "#C0C0C0"
        ctx.fillRect(-item.width / 2, -item.height / 2, item.width, item.height)
        ctx.fillStyle = "#FF0000"
        ctx.fillRect(-item.width / 2, -item.height / 2 + 5, item.width, 8)
        break
    }

    ctx.restore()
  }

  const drawOcean = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Ocean gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, "#87CEEB")
    gradient.addColorStop(0.5, "#4682B4")
    gradient.addColorStop(1, "#191970")

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Bubbles
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
    for (let i = 0; i < 10; i++) {
      const x = (Date.now() / 50 + i * 100) % canvas.width
      const y = (Date.now() / 30 + i * 80) % canvas.height
      ctx.beginPath()
      ctx.arc(x, y, Math.sin(Date.now() / 1000 + i) * 3 + 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const checkCollision = (obj1: GameObject, obj2: GameObject): boolean => {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    )
  }

  const spawnDebris = (canvas: HTMLCanvasElement) => {
    if (Math.random() < 0.02) {
      const types: Debris["type"][] = ["bottle", "bag", "can"]
      const type = types[Math.floor(Math.random() * types.length)]

      const newDebris: Debris = {
        x: Math.random() * (canvas.width - 40),
        y: -50,
        width: type === "bag" ? 35 : 25,
        height: type === "bottle" ? 40 : type === "bag" ? 30 : 35,
        speed: Math.random() * 2 + 1,
        type,
        rotation: 0,
      }

      debris.current.push(newDebris)
    }
  }

  const updateGame = useCallback((canvas: HTMLCanvasElement) => {
    const currentTurtle = turtle.current

    if (keys.current["ArrowUp"] && currentTurtle.targetY > 0) {
      currentTurtle.targetY -= currentTurtle.speed
    }
    if (keys.current["ArrowDown"] && currentTurtle.targetY < canvas.height - currentTurtle.height) {
      currentTurtle.targetY += currentTurtle.speed
    }
    if (keys.current["ArrowLeft"] && currentTurtle.x > 0) {
      currentTurtle.x -= currentTurtle.speed
    }
    if (keys.current["ArrowRight"] && currentTurtle.x < canvas.width - currentTurtle.width) {
      currentTurtle.x += currentTurtle.speed
    }

    currentTurtle.y += (currentTurtle.targetY - currentTurtle.y) * 0.1

    debris.current = debris.current.filter((item) => {
      item.y += item.speed
      item.rotation += 0.02
      return item.y < canvas.height + 50
    })

    for (const item of debris.current) {
      if (checkCollision(currentTurtle, item)) {
        setGameState("gameOver")
        return
      }
    }

    spawnDebris(canvas)
    if (Date.now() - lastUpdateTime.current > 200) {
      setScore((prev) => prev + 1)
      lastUpdateTime.current = Date.now()
    }
  }, [setGameState, setScore])


  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw ocean background
    drawOcean(ctx, canvas)

    // Update and draw game objects
    if (gameState === "playing") {
      updateGame(canvas)
    }

    // Draw turtle
    drawTurtle(ctx, turtle.current)

    // Draw debris
    debris.current.forEach((item) => drawDebris(ctx, item))

    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [gameState, updateGame])

  const startGame = () => {
    // Reset game state
    turtle.current = {
      x: 100,
      y: 200,
      width: 60,
      height: 40,
      speed: 5,
      targetY: 200,
    }
    debris.current = []
    setScore(0)
    setGameState("playing")
  }

  const endGame = () => {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem("turtle-game-high-score", score.toString())
    }
    setGameState("gameOver")
  }

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Empêcher le scroll de la page quand on joue
      if (gameState === "playing" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault()
      }
      keys.current[e.code] = true
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Empêcher le scroll de la page quand on joue
      if (gameState === "playing" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault()
      }
      keys.current[e.code] = false
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [gameState])

  // Handle touch input for mobile
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      turtle.current.targetY = y - turtle.current.height / 2
      turtle.current.x = Math.max(0, Math.min(canvas.width - turtle.current.width, x - turtle.current.width / 2))
    }

    canvas.addEventListener("touchmove", handleTouch)
    canvas.addEventListener("touchstart", handleTouch)

    return () => {
      canvas.removeEventListener("touchmove", handleTouch)
      canvas.removeEventListener("touchstart", handleTouch)
    }
  }, [])

  // Start game loop
  useEffect(() => {
    gameLoop()
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameLoop])

  // Handle game over
  useEffect(() => {
    if (gameState === "gameOver") {
      endGame()
    }
  }, [gameState, score, highScore])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-800 flex items-center justify-center p-4 px-8 md:px-16 lg:px-24 relative overflow-hidden">

      {/* Contenu principal du jeu */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border-4 border-white rounded-lg shadow-2xl max-w-full h-auto"
            style={{ maxWidth: "100vw", maxHeight: "70vh" }}
          />

          {/* Game UI Overlay */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <Card className="p-3 bg-white/90 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-lg font-bold text-blue-800">
                <Trophy className="w-5 h-5" />
                Score: {score}
              </div>
            </Card>

            <Card className="p-3 bg-white/90 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-lg font-bold text-purple-800">
                <Heart className="w-5 h-5" />
                Record: {highScore}
              </div>
            </Card>
          </div>

          {/* Menu Screen */}
          {gameState === "menu" && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center">
              <Card className="p-8 text-center max-w-md mx-4">
                <h1 className="text-3xl font-bold text-blue-800 mb-4">🐢 Tortue des Océans</h1>
                <p className="text-gray-600 mb-4">Aide la tortue à éviter les déchets plastiques !</p>
                <p className="text-sm text-red-600 font-semibold mb-6">
                  💔 Chaque année, 8 millions de tonnes de plastique finissent dans les océans
                </p>
                <p className="text-gray-600 mb-6">Utilise les flèches du clavier ou touche l&apos;écran pour naviguer.</p>
                <Button onClick={startGame} size="lg" className="w-full">
                  <Play className="w-5 h-5 mr-2" />
                  Commencer à jouer
                </Button>
              </Card>
            </div>
          )}

          {/* Game Over Screen */}
          {gameState === "gameOver" && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center">
              <Card className="p-8 text-center max-w-md mx-4">
                <h2 className="text-2xl font-bold text-red-600 mb-4">💔 Game Over</h2>
                <p className="text-gray-600 mb-4">La tortue a touché un déchet plastique !</p>
                <div className="space-y-2 mb-6">
                  <p className="text-lg">
                    <span className="font-semibold">Score final:</span> {score}
                  </p>
                  {score === highScore && score > 0 && <p className="text-yellow-600 font-bold">🎉 Nouveau record !</p>}
                  <p className="text-sm text-orange-600 font-medium mt-4">
                    🌊 Ensemble, protégeons nos océans de la pollution plastique
                  </p>
                </div>
                <Button onClick={startGame} size="lg" className="w-full">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Rejouer
                </Button>
              </Card>
            </div>
          )}
        </div>

        {/* Instructions avec message environnemental */}
        <Card className="mt-6 p-4 max-w-2xl text-center bg-white/90 backdrop-blur-sm">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Contrôles:</strong> Flèches directionnelles (PC) ou touchez l&apos;écran (Mobile)
          </p>
          <p className="text-sm text-green-700 font-semibold">
            🌍 <strong>Mission:</strong> Sensibiliser à la protection de la vie marine contre la pollution plastique
          </p>
        </Card>

        {/* Section informative sur les tortues marines */}
        <div className="mt-12 w-full max-w-4xl space-y-6">
          <Card className="p-6 bg-white/95 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-red-700 mb-4 text-center">
              🚨 L&apos;Impact Dramatique de la Pollution Plastique sur les Tortues Marines
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                  <h3 className="font-bold text-red-800 mb-2">💔 Statistiques Alarmantes</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Plus de 1000 tortues marines meurent chaque jour à cause des déchets plastiques</li>
                    <li>• 52% des tortues marines ont ingéré du plastique</li>
                    <li>• Les sacs plastiques sont souvent confondus avec des méduses, leur nourriture favorite</li>
                    <li>• Une tortue peut mourir après avoir ingéré seulement 14 morceaux de plastique</li>
                  </ul>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                  <h3 className="font-bold text-orange-800 mb-2">⚠️ Conséquences Mortelles</h3>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• Obstruction intestinale fatale</li>
                    <li>• Empoisonnement par les toxines plastiques</li>
                    <li>• Blessures causées par les débris coupants</li>
                    <li>• Enchevêtrement dans les filets et cordes</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-bold text-blue-800 mb-2">🌊 Dans Nos Océans</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 8 millions de tonnes de plastique déversées chaque année</li>
                    <li>• 5 000 milliards de morceaux de plastique flottent dans nos océans</li>
                    <li>• Le plastique met 450 ans à se décomposer</li>
                    <li>• 80% des déchets marins proviennent de la terre</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <h3 className="font-bold text-green-800 mb-2">💚 Comment Agir ?</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Réduire l&apos;usage du plastique à usage unique</li>
                    <li>• Participer aux nettoyages de plages</li>
                    <li>• Recycler correctement ses déchets</li>
                    <li>• Sensibiliser son entourage</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-100 to-green-100 rounded-lg text-center">
              <p className="text-lg font-semibold text-gray-800 mb-2">
                🐢 &quot;Chaque geste compte pour sauver nos tortues marines&quot;
              </p>
              <p className="text-sm text-gray-600">
                Les tortues marines existent depuis plus de 100 millions d&apos;années. Ne laissons pas la pollution
                plastique mettre fin à leur histoire.
              </p>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-r from-teal-500 to-blue-600 text-white text-center">
            <p className="font-bold text-lg mb-2">🌍 Ensemble, protégeons nos océans !</p>
            <p className="text-sm opacity-90">
              Ce jeu vise à sensibiliser sur l&apos;urgence de protéger la vie marine. Partagez ce message pour amplifier
              l&apos;impact !
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
