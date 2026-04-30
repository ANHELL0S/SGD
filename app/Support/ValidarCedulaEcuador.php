<?php

namespace App\Support;

class ValidarCedulaEcuador
{
    public static function validar(string $cedula): bool
    {
        // Longitud
        if (!preg_match('/^\d{10}$/', $cedula)) {
            return false;
        }

        // Provincia
        $provincia = intval(substr($cedula, 0, 2));
        if (!(($provincia >= 1 && $provincia <= 24) || $provincia === 30)) {
            return false;
        }

        // Tercer dígito
        $tercerDigito = intval($cedula[2]);
        if ($tercerDigito >= 6) {
            return false;
        }

        // Módulo 10
        $coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        $suma = 0;
        for ($i = 0; $i < 9; $i++) {
            $valor = intval($cedula[$i]) * $coeficientes[$i];
            if ($valor >= 10) {
                $valor -= 9;
            }
            $suma += $valor;
        }
        $decenaSuperior = ceil($suma / 10) * 10;
        $digitoVerificador = $decenaSuperior - $suma;
        if ($digitoVerificador === 10) {
            $digitoVerificador = 0;
        }
        return intval($cedula[9]) === $digitoVerificador;
    }
}
