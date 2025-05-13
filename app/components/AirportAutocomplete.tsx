import React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import airportsJson from "airports-json";

// airports-json exports an object with an 'airports' property (array)
const airportList = airportsJson.airports
  .filter((a: any) => a.iata_code && a.name && a.municipality)
  .map((a: any) => ({
    iata: a.iata_code,
    name: a.name,
    city: a.municipality,
    country: a.iso_country,
    label: `${a.iata_code} - ${a.name}, ${a.municipality}, ${a.iso_country}`,
  }));

export interface AirportOption {
  iata: string;
  name: string;
  city: string;
  country: string;
  label: string;
}

interface Props {
  value: AirportOption | null;
  onChange: (value: AirportOption | null) => void;
  label?: string;
  required?: boolean;
}

export const AirportAutocomplete: React.FC<Props> = ({ value, onChange, label = "Airport", required = false }) => {
  return (
    <Autocomplete
      options={airportList}
      getOptionLabel={(option) => {
  if (typeof option === 'string') return option;
  if (!option) return '';
  if (option.label) return option.label;
  // fallback for custom/freeSolo
  if (option.iata && option.name && option.city && option.country) {
    return `${option.iata} - ${option.name}, ${option.city}, ${option.country}`;
  }
  return option.iata || '';
}}
      value={value}
      onChange={(_, newValue) => {
        if (typeof newValue === "string") {
          onChange({
            iata: newValue,
            name: "",
            city: "",
            country: "",
            label: newValue,
          });
        } else {
          onChange(newValue);
        }
      }}
      onInputChange={(_, inputValue, reason) => {
        if (reason === "input" && inputValue && (!value || inputValue !== value.label)) {
          onChange({
            iata: inputValue,
            name: "",
            city: "",
            country: "",
            label: inputValue,
          });
        }
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} required={required} variant="outlined" />
      )}
      filterSelectedOptions
      isOptionEqualToValue={(option, val) => option.iata === val.iata}
      freeSolo
    />
  );
};

