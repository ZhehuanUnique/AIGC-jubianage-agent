import React from 'react'

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <table className="w-full">
        <thead className="bg-white border-b border-gray-200">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-200">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <div className={`h-4 bg-gray-200 rounded ${colIndex === 0 ? 'w-8' : colIndex === columns - 1 ? 'w-20' : 'w-24'}`}></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TableSkeleton
