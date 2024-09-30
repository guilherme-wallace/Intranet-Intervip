import { Router } from 'express';
import { exec } from 'child_process';
import * as path from 'path';

const router = Router();

router.post('/run-olt-script', (req, res) => {
    const {
        use_OLT_Antiga,
        use_OLT_Nova,
        pon_ANTIGA,
        onu_ID,
        ont_LIN_PROF,
        ont_SRV_PROF,
        ont_native_vlan,
        ont_vlan_service_port,
        ont_gem_PORT,
        ont_user_vlan
    } = req.body;

    // Absolute path to the Python script
    const scriptPath = path.resolve(__dirname, '../../public/scriptsPy/migraOnus/main.py');

    // Constructing the command to pass arguments to the Python script
    const pythonCommand = `python ${scriptPath} ${use_OLT_Antiga} ${use_OLT_Nova} ${pon_ANTIGA} ${onu_ID} ${ont_LIN_PROF || 'None'} ${ont_SRV_PROF || 'None'} ${ont_native_vlan || 'None'} ${ont_vlan_service_port || 'None'} ${ont_gem_PORT || 'None'} ${ont_user_vlan || 'None'}`;

    // Execute the Python script
    exec(pythonCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).send(`Error running script: ${error.message}`);
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).send(`Script stderr: ${stderr}`);
        }
        console.log(`Script output: ${stdout}`);
        res.send(`Script executed successfully! Output: ${stdout}`);
    });
});

export default router;
