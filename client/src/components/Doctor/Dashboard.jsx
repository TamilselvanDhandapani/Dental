import React from 'react'
import { Link } from 'react-router-dom'

const Dashboard = () => {
  return (
 <>
   <div>
     <h1 className="text-2xl font-bold">Dashboard</h1>
   <p className="mt-4">Welcome to your dashboard!</p>
   </div>
   <div>
  <Link to="/form" className="text-blue-500 hover:underline">
    New Patient Form
  </Link>
</div>

 </>
  )
}

export default Dashboard