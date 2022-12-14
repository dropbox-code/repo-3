import React from "react";

import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControl from '@material-ui/core/FormControl';
import Typography from '@material-ui/core/Typography';

import { WidgetProps } from "@visma/rjsf-core";
import { FormHelperText } from '@material-ui/core';

const getScore = (choices: {enumNames: string, enum?: string, meta?: {score: number}}[], value: string) => {
  let choice = choices.find(choice => choice.enum === value);
  if (!choice) {
    choice = choices[Number(value)];
  }
  return choice && choice.meta ? choice.meta.score : 0;
}

const RadioWidget = ({
  id,
  schema,
  label,
  options,
  value,
  disabled,
  readonly,
  onChange,
  onBlur,
  onFocus,
}: WidgetProps) => {
  const { enumOptions, enumDisabled } = options;

  const _onChange = ({}, value: any) =>
    onChange(schema.type == "boolean" ? value !== "false" : value);
  const _onBlur = ({ target: { value } }: React.FocusEvent<HTMLInputElement>) =>
    onBlur(id, value);
  const _onFocus = ({
    target: { value },
  }: React.FocusEvent<HTMLInputElement>) => onFocus(id, value);

  const row = options ? options.inline : false;
  const showScore = options ? options.showScore : false;
  const rawChoices = options && options!.element ?
    (options!.element! as {choices: {enumNames: string, enum?: string, meta?: {score: number}}[]}).choices :
    [];

  return (
    <div style={{display: 'flex'}}>
      <div style={{flex: '1 1'}}>
        <FormControl component="fieldset">
          <legend style={{position: 'absolute', clip: 'rect(0,0,0,0)'}}>{label}</legend>
          {schema.type === 'boolean' && <FormHelperText component="span" >{options.description}</FormHelperText>}
          <RadioGroup
            value={`${value}`}
            row={row as boolean}
            onChange={_onChange}
            onBlur={_onBlur}
            onFocus={_onFocus}>
            {(enumOptions as any).map((option: any, i: number) => {
              const itemDisabled =
                enumDisabled && (enumDisabled as any).indexOf(option.value) != -1;

              const radio = (
                <FormControlLabel
                  control={<Radio color="primary" key={i} />}
                  label={`${option.label}`}
                  value={`${option.value}`}
                  key={i}
                  disabled={disabled || itemDisabled || readonly}
                />
              );

              return radio;
            })}
          </RadioGroup>
        </FormControl>
      </div>
      { (showScore && value) &&
        <Typography>{
          getScore(rawChoices, value)
        }</Typography>
      }
    </div>
  );
};

export default RadioWidget;
