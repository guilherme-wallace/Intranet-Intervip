import paramiko
import time
import re
import os
import json

def ssh_connect_and_execute_autofind(autofind_onus_json_path, hostnameOLTNova, username, password, delay=0.2, timeout=6, max_loops=20):
    commands_summary = [
        "enable",
        "config",
        "display ont autofind all | no-more"
    ]

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostnameOLTNova, username=username, password=password, timeout=timeout)
        ssh_shell = client.invoke_shell()

        full_output = ""

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

            full_output += output

        # Filtra as informações relevantes usando expressões regulares
        matches = re.findall(r'F/S/P\s+:\s+(\d+/\d+/\d+).*?Ont SN\s+:\s+(\w+).*?Ont EquipmentID\s+:\s+(\w+)', full_output, re.DOTALL)

        # Estrutura os dados em formato de dicionário para salvar em JSON
        onus = [{"F/S/P": match[0], "Ont SN": match[1], "Ont EquipmentID": match[2]} for match in matches]

        # Diretório de saída
        output_dir = 'src'
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # Salvando as informações em um arquivo JSON
        with open(autofind_onus_json_path, 'w') as json_file:
            json.dump(onus, json_file, indent=4)

        print(f"As informações foram salvas em '{autofind_onus_json_path}'.")

    except paramiko.AuthenticationException:
        print("Erro de autenticação. Verifique o usuário e senha.")
    except paramiko.SSHException as ssh_exception:
        print(f"Erro de SSH: {ssh_exception}")
    except Exception as e:
        print(f"Erro ao conectar ou executar comandos: {e}")
    finally:
        client.close()

