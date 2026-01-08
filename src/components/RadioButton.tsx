/**
 * 单选按钮组件
 * 用于替代默认的 radio 按钮，提供更好的视觉效果
 */

interface RadioButtonProps {
  name: string
  value: string
  checked: boolean
  onChange: (value: string) => void
  label: string
  description?: string
  disabled?: boolean
  color?: 'purple' | 'green' | 'blue' | 'orange'
}

function RadioButton({ 
  name, 
  value, 
  checked, 
  onChange, 
  label, 
  description,
  disabled = false,
  color = 'purple'
}: RadioButtonProps) {
  const colorClass = `custom-radio-${color}`
  
  return (
    <label className={`custom-radio-button ${disabled ? 'custom-radio-disabled' : ''}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        disabled={disabled}
      />
      <div className={`custom-radio-circle ${colorClass}`}></div>
      <div className="custom-radio-content">
        <span className="custom-radio-label">{label}</span>
        {description && <span className="custom-radio-description">{description}</span>}
      </div>
    </label>
  )
}

export default RadioButton
