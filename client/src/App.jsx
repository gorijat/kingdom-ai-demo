import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [message, setMessage] = useState('');

  return (
    <>
    <input type="text" name="" id=""
    onChange={(e)=>{setMessage(e.target.value)}} />
    <button onClick={()=>{message}}>Save</button>
     <button onClick={()=>{setCount(count + 1)}}>{count}</button>
    </>
  )
}

export default App
