import { type NextApiRequest, type NextApiResponse } from "next";

import { prisma } from "../../../server/db/client";

import * as Ably from 'ably';

const ABLY_KEY = process.env.ABLY_KEY;

const options: Ably.Types.ClientOptions = { key: ABLY_KEY };
const client = new Ably.Realtime(options); /* inferred type Ably.Realtime */
const channel = client.channels.get('feed'); /* inferred type Ably.Types.RealtimeChannel */


const checkJob = async (req: NextApiRequest, res: NextApiResponse) => {
    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ error: "Missing id" });
    }

    const job = await prisma.job.findUnique({
        where: {
            id: id as string
        }
    });

    if (!job) {
        return res.status(400).json({ error: "Job not found" });
    }


    res.status(200).json({
        ...job,
        urls: job.images
    });
};

export default checkJob;
