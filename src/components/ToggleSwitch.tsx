/**
 * 开关按钮组件
 * 用于替代复选框，提供更好的视觉效果
 */

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <label className={`toggle-switch ${disabled ? 'toggle-switch-disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="toggle-slider"></span>
    </label>
  )
}

export default ToggleSwitch
