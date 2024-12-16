import paramiko
import time
import re
import json
import os

def ssh_connect_and_execute_summary(ontSummary_path, hostnameOLTAntiga, username, password, autofind_onus_file, onus_config_file, delay=0.2, timeout=6, max_loops=20):
    # Carregar os arquivos JSON
    with open(autofind_onus_file, 'r') as file:
        autofind_onus = json.load(file)

    with open(onus_config_file, 'r') as file:
        onus_config = json.load(file)

    # Criar um dicionário de SNs autorizados
    authorized_sns = {onu['sn_auth'] for onu in onus_config}

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostnameOLTAntiga, username=username, password=password, timeout=timeout)
        ssh_shell = client.invoke_shell()

        ont_summary_data = []
        processed_fsp = set()  # Conjunto para rastrear os F/S/P já processados

        for onu in autofind_onus:
            f_s_p = onu['F/S/P']
            sn = onu['Ont SN']

            if sn not in authorized_sns or f_s_p in processed_fsp:
                continue  # Pula se SN não autorizado ou F/S/P já processado

            commands_summary = [
                "enable",
                "config",
                f"display ont info summary {f_s_p} | no-more"
            ]

            full_currentPort = ""

            for command in commands_summary:
                ssh_shell.send(command + '\n')
                time.sleep(delay)

                output = ""
                loops = 0
                while loops < max_loops:
                    if ssh_shell.recv_ready():
                        chunk = ssh_shell.recv(4096).decode('utf-8')
                        output += chunk

                        if "{ <cr>||<K> }" in chunk:
                            ssh_shell.send('\n')
                            time.sleep(delay)

                    else:
                        time.sleep(0.5)

                    loops += 1

                full_currentPort += output

            # Marcar o F/S/P como processado
            processed_fsp.add(f_s_p)

            # Extrair as informações de interesse usando regex
            ont_info = re.findall(r'^\s*\d+\s+[A-F0-9]+\s+\S+\s+.*$', full_currentPort, re.MULTILINE)

            for info in ont_info:
                info_parts = re.split(r'\s+', info.strip(), maxsplit=5)
                ont_summary_data.append({
                    "F/S/P": f_s_p,
                    "ONT ID": info_parts[0],
                    "SN": info_parts[1],
                    "Type": info_parts[2],
                    "Distance": info_parts[3],
                    "Rx/Tx power": info_parts[4],
                    "Description": info_parts[5]
                })

        
        with open(ontSummary_path, 'w') as file:
            json.dump(ont_summary_data, file, indent=4)

        print(f"As informações das ONUs foram salvas em '{ontSummary_path}'.")

    except paramiko.AuthenticationException:
        print("Erro de autenticação. Verifique o usuário e senha.")
    except paramiko.SSHException as ssh_exception:
        print(f"Erro de SSH: {ssh_exception}")
    except Exception as e:
        print(f"Erro ao conectar ou executar comandos: {e}")
    finally:
        client.close()

