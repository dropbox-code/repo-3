import React from "react";

import Slider from "@material-ui/core/Slider";

import { utils } from "@visma/rjsf-core";
import { WidgetProps } from "@visma/rjsf-core";

const { rangeSpec } = utils;

const getScaleProps = (options: {element: {widget?: string, scaleMarks?: [{value: number, label: string}]}}) => {
  const scaleMarks =
    options.element.scaleMarks && options.element.scaleMarks![0] === undefined
      ? undefined
      : options.element.scaleMarks;
  return { widget: options.element.widget, scaleMarks: scaleMarks};
}

const calculateMultiplier = (min: number, max: number, step: number) => {
  let multiplier = 1;
  const range = max-min;
  const maxAmountOfMarks = 10;
  let amountOfMarks = range/step;

  // finds a multiplier for step so that there are not too many marks
  // and all marks are also valid values
  while (amountOfMarks >= maxAmountOfMarks) {
    multiplier++;
    if (range%(step*multiplier) === 0) {
      amountOfMarks = range/(step*multiplier);
    } else {
      if (multiplier/range > 0.5) {
        multiplier = -1;
        amountOfMarks = 0;
      }
    }
  }

  return multiplier;

  /*
  let multiplier = 1;
  let amountOfMarks = (max-min)/step;

  while (amountOfMarks >= 10) {
    multiplier++;
    if ((max-min)%(step*multiplier))
    amountOfMarks = (max-min)/(step*multiplier);
  }

  return multiplier;
  */
}

const generateWithMiddleMarks = (min: number, max: number, step: number) => {
  const middleMarks = [];

  for (let i = min; i < max; i = i + step) {
    middleMarks.push({value: i, label: i.toString()});
  }

  middleMarks.push({value: max, label: max.toString()})

  return middleMarks;
}

const generateEndpointMarks = (min?: number, max?: number) => {
  if (min === undefined || max === undefined ) {
    return undefined;
  } else {
    return [{value: min!, label: min!.toString()}, {value: max!, label: max!.toString()}];
  }
}

const generateMarks = (min?: number, max?: number, step?: number) => {
  if (min === undefined || max === undefined ) {
    return [];
  }

  const multiplier = calculateMultiplier(min!, max!, step ? step : 1);

  if (multiplier > 0) {
    return generateWithMiddleMarks(min!, max!, (step ? step : 1)*multiplier);
  }

  return generateEndpointMarks(min, max);
}

const RangeWidget = ({
  value,
  readonly,
  disabled,
  onBlur,
  onFocus,
  options,
  schema,
  onChange,
  label,
  id,
}: WidgetProps) => {
  const sliderProps = { value, label, id, ...rangeSpec(schema) };
  const scaleProps = options.element
    ? getScaleProps(options as { element: {widget?: string, scaleMarks?: [{value: number, label: string}]}})
    : { widget: 'noScale', scaleMarks: undefined };

  const _onChange = ({}, value: any) =>
    onChange(value === "" ? options.emptyValue : value);
  const _onBlur = ({ target: { value } }: React.FocusEvent<HTMLInputElement>) =>
    onBlur(id, value);
  const _onFocus = ({
    target: { value },
  }: React.FocusEvent<HTMLInputElement>) => onFocus(id, value);

  const marks = scaleProps.widget === 'customScale'
    ? scaleProps.scaleMarks
    : scaleProps.widget === 'automaticScale'
      ? generateMarks(sliderProps.min, sliderProps.max, sliderProps.step)
      : generateEndpointMarks(sliderProps.min, sliderProps.max);

  let ariaLabel = label;

  if (!ariaLabel) {
    const element = options!.element as {label: string, title: string, useLabel: boolean};
    ariaLabel = element.useLabel ? element.label : element.title;
  }

  return (
    <>
      <Slider
        aria-label={ariaLabel}
        disabled={disabled || readonly}
        onChange={_onChange}
        onBlur={_onBlur}
        onFocus={_onFocus}
        valueLabelDisplay="auto"
        marks={marks}
        {...sliderProps}
      />
    </>
  );
};

export default RangeWidget;
