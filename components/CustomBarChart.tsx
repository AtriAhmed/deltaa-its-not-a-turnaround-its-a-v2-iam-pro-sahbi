import { View, StyleSheet, Dimensions } from "react-native"
import Svg, { Rect, G, Text as SvgText } from "react-native-svg"

interface BarChartProps {
  data: number[]
  labels: string[]
  height: number
  width?: number
  barColor: string
  showValues?: boolean
  valuePrefix?: string
  valueSuffix?: string
}

const CustomBarChart = ({
  data,
  labels,
  height,
  width = Dimensions.get("window").width - 32,
  barColor,
  showValues = true,
  valuePrefix = "",
  valueSuffix = "",
}: BarChartProps) => {
  if (!data || data.length === 0) return null

  const maxValue = Math.max(...data) * 1.2 // Add 20% padding to the top
  const chartWidth = width
  const chartHeight = height - 40 // Reserve space for labels
  const barWidth = (chartWidth - 40) / data.length - 10 // Account for padding
  const barRadius = 5 // Rounded corners radius

  // Format value for display
  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toString()
  }

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={chartHeight + 40}>
        {/* Y-axis grid lines */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((ratio, index) => {
          const y = chartHeight - chartHeight * ratio
          return (
            <G key={index}>
              <SvgText x="10" y={y + 5} fontSize="10" fill="#888" textAnchor="start">
                {formatValue(maxValue * ratio)}
              </SvgText>
              <Rect x="40" y={y} width={chartWidth - 50} height="1" fill="#EEEEEE" />
            </G>
          )
        })}

        {/* Bars */}
        {data.map((value, index) => {
          const barHeight = (value / maxValue) * chartHeight
          const x = 40 + index * ((chartWidth - 40) / data.length)
          const y = chartHeight - barHeight

          return (
            <G key={index}>
              {/* Bar with rounded top corners */}
              <Rect x={x} y={y} width={barWidth} height={barHeight} fill={barColor} rx={barRadius} ry={barRadius} />

              {/* Value on top of bar */}
              {showValues && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 10}
                  fontSize="12"
                  fontWeight="bold"
                  fill="#333"
                  textAnchor="middle"
                >
                  {valuePrefix + formatValue(value) + valueSuffix}
                </SvgText>
              )}

              {/* X-axis label */}
              <SvgText x={x + barWidth / 2} y={chartHeight + 20} fontSize="10" fill="#888" textAnchor="middle">
                {labels[index]}
              </SvgText>
            </G>
          )
        })}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
})

export default CustomBarChart
